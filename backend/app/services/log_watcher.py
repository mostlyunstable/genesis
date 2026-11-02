import os
import shutil
import csv
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.schemas.event import RawLogItem
from backend.app.services.ingest import NormalizerService
from backend.app.services.detection import detection_engine
from backend.app.models.event import SecurityEventModel

logger = logging.getLogger(__name__)


class LogWatcherService:
    """
    Automated Log Directory Ingestion Watcher (Stage A & B).
    Continuously monitors drop directories for incoming raw security logs (.log, .txt, .csv, .json),
    normalizes events, deduplicates against DB, feeds into detection pipeline, and archives.
    """

    def __init__(
        self,
        incoming_dir: str = "data/incoming",
        processed_dir: str = "data/processed"
    ):
        self.incoming_dir = incoming_dir
        self.processed_dir = processed_dir
        self._ensure_directories()

    def _ensure_directories(self):
        os.makedirs(self.incoming_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)

    async def scan_and_ingest(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Scans incoming directory, ingests all waiting log files,
        triggers real-time detection heuristics, and archives processed logs.
        """
        self._ensure_directories()
        files = [
            f for f in os.listdir(self.incoming_dir)
            if not f.startswith(".") and os.path.isfile(os.path.join(self.incoming_dir, f))
        ]

        if not files:
            return {
                "status": "NO_FILES",
                "files_scanned": 0,
                "events_processed": 0,
                "new_events_ingested": 0,
                "detections_triggered": 0,
                "processed_files": []
            }

        total_scanned_files = len(files)
        total_events_processed = 0
        new_events_count = 0
        detections_triggered = 0
        processed_file_records = []

        for filename in files:
            file_path = os.path.join(self.incoming_dir, filename)
            raw_lines: List[str] = []

            # 1. Read file contents based on extension
            try:
                if filename.endswith(".json"):
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for item in data:
                                raw_lines.append(json.dumps(item) if isinstance(item, dict) else str(item))
                        elif isinstance(data, dict):
                            raw_lines.append(json.dumps(data))
                elif filename.endswith(".csv"):
                    with open(file_path, "r", encoding="utf-8") as f:
                        reader = csv.reader(f)
                        headers = next(reader, None)
                        for row in reader:
                            if row:
                                raw_lines.append(", ".join(row))
                else:  # .log, .txt, or generic text
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        for line in f:
                            s = line.strip()
                            if s:
                                raw_lines.append(s)
            except Exception as e:
                logger.error(f"Failed to read file {filename}: {e}")
                continue

            file_events = 0
            file_detections = 0

            # 2. Ingest and detect line-by-line
            for line in raw_lines:
                total_events_processed += 1
                item = RawLogItem(raw=line)
                parsed = NormalizerService.parse_log(source="generic", item=item)
                if not parsed:
                    continue

                # Deduplication check
                stmt = select(SecurityEventModel.id).where(SecurityEventModel.fingerprint == parsed.fingerprint)
                existing = await db.execute(stmt)
                if existing.scalar_one_or_none():
                    continue

                db.add(parsed)
                file_events += 1
                new_events_count += 1

                # Feed directly to Real-Time Detection Engine
                dets = await detection_engine.process_event(parsed, db)
                if dets:
                    detections_triggered += len(dets)
                    file_detections += len(dets)

            await db.commit()

            # 3. Archive processed file with timestamp
            ts_suffix = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            archive_name = f"{ts_suffix}_{filename}"
            archive_path = os.path.join(self.processed_dir, archive_name)
            try:
                shutil.move(file_path, archive_path)
            except Exception as e:
                logger.warning(f"Failed to archive file {filename}: {e}")

            processed_file_records.append({
                "filename": filename,
                "archived_as": archive_name,
                "events": file_events,
                "detections": file_detections
            })

        return {
            "status": "SUCCESS",
            "files_scanned": total_scanned_files,
            "events_processed": total_events_processed,
            "new_events_ingested": new_events_count,
            "detections_triggered": detections_triggered,
            "processed_files": processed_file_records
        }


log_watcher = LogWatcherService()
