import os
import re
import csv
import io
import json
import hashlib
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.chat import UploadedFileModel
from backend.app.models.event import SecurityEventModel
from backend.app.schemas.event import RawLogItem
from backend.app.services.ingest import NormalizerService
from backend.app.services.detection import detection_engine
from backend.app.services.correlation import correlation_engine

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".csv", ".json", ".jsonl", ".txt", ".log", ".syslog"}


class FileIngestService:
    def __init__(self):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        # Strip directory traversal characters
        clean = os.path.basename(filename)
        clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean)
        return clean or "uploaded_security_log.log"

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def detect_format(filename: str, sample_text: str) -> Tuple[str, str]:
        """
        Auto-detect format and security log source based on extension and content signature.
        Returns: (format_detected, log_source)
        """
        ext = os.path.splitext(filename)[1].lower()
        first_lines = [line.strip() for line in sample_text.strip().split("\n")[:10] if line.strip()]
        sample_block = "\n".join(first_lines)

        # 1. JSON or JSONL
        if ext == ".json" or (first_lines and first_lines[0].startswith("[") and sample_text.strip().endswith("]")):
            # Check if Okta or generic SSO
            if "actor" in sample_block or "eventType" in sample_block:
                return "json", "okta"
            return "json", "app_auth"

        if ext == ".jsonl" or (first_lines and first_lines[0].startswith("{") and first_lines[0].endswith("}")):
            if "actor" in sample_block or "eventType" in sample_block:
                return "jsonl", "okta"
            return "jsonl", "app_auth"

        # 2. CSV
        if ext == ".csv" or ("," in (first_lines[0] if first_lines else "") and ("ip" in first_lines[0].lower() or "user" in first_lines[0].lower() or "timestamp" in first_lines[0].lower())):
            return "csv", "csv_telemetry"

        # 3. RFC 5424 Syslog
        if re.match(r"^<\d+>\d+\s+\S+", sample_block):
            return "rfc5424", "syslog"

        # 4. OpenSSH
        if "sshd[" in sample_block or "Failed password for" in sample_block or "Accepted password for" in sample_block:
            return "openssh", "linux_ssh"

        # 5. Linux PAM
        if "pam_unix" in sample_block:
            return "pam", "linux_auth"

        # 6. Windows Security Events
        if "Event 4625" in sample_block or "Event 4624" in sample_block or "An account failed to log on" in sample_block:
            return "windows_security", "windows_security"

        return "generic_log", "syslog"

    async def ingest_file(
        self,
        conversation_id: str,
        filename: str,
        content: bytes,
        db: AsyncSession,
        user_id: Optional[str] = None
    ) -> UploadedFileModel:
        """
        Processes uploaded cybersecurity log file:
        Validates, saves, extracts records, normalizes into security_events,
        runs detection engine, correlates findings, and updates record status.
        """
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds maximum permitted limit of {MAX_FILE_SIZE // (1024*1024)}MB.")

        safe_name = self.sanitize_filename(filename)
        ext = os.path.splitext(safe_name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

        file_hash = self.compute_sha256(content)
        file_id = f"file_{int(time.time()*1000)%1000000:06d}_{file_hash[:8]}"
        saved_path = os.path.join(UPLOAD_DIR, f"{file_id}_{safe_name}")

        with open(saved_path, "wb") as f:
            f.write(content)

        # Decode content sample for format detection
        sample_str = content[:8192].decode("utf-8", errors="replace")
        format_detected, log_source = self.detect_format(safe_name, sample_str)

        # Create record in DB with processing status
        now = datetime.now(timezone.utc)
        file_record = UploadedFileModel(
            id=file_id,
            conversation_id=conversation_id,
            filename=safe_name,
            file_hash=file_hash,
            file_size=len(content),
            format_detected=format_detected,
            log_source=log_source,
            record_count=0,
            parsed_count=0,
            failed_count=0,
            skipped_count=0,
            detection_count=0,
            incident_count=0,
            status="processing",
            storage_path=saved_path,
            analysis_summary={},
            created_at=now,
            user_id=user_id
        )
        db.add(file_record)
        await db.commit()
        await db.refresh(file_record)

        try:
            full_text = content.decode("utf-8", errors="replace")
            raw_lines: List[str] = []

            if format_detected == "csv":
                reader = csv.reader(io.StringIO(full_text))
                header = next(reader, None)
                for row in reader:
                    if row:
                        raw_lines.append(",".join(row))
            elif format_detected == "json":
                try:
                    data = json.loads(full_text)
                    if isinstance(data, list):
                        for item in data:
                            raw_lines.append(json.dumps(item) if isinstance(item, dict) else str(item))
                    elif isinstance(data, dict):
                        # Might have an "events" or "logs" key
                        events_list = data.get("events") or data.get("logs") or [data]
                        for item in events_list:
                            raw_lines.append(json.dumps(item) if isinstance(item, dict) else str(item))
                except Exception:
                    raw_lines = [l.strip() for l in full_text.splitlines() if l.strip()]
            else:
                raw_lines = [l.strip() for l in full_text.splitlines() if l.strip()]

            file_record.record_count = len(raw_lines)

            # Parse and normalize each line
            new_events: List[SecurityEventModel] = []
            parsed_count = 0
            failed_count = 0
            skipped_count = 0

            observed_ips = set()
            observed_users = set()
            failure_count = 0
            success_count = 0

            for raw in raw_lines:
                if not raw:
                    skipped_count += 1
                    continue

                item = RawLogItem(raw=raw, metadata={"sourceFile": safe_name, "fileId": file_id})
                evt = NormalizerService.parse_log(log_source, item)

                if not evt:
                    failed_count += 1
                    continue

                # Deduplication check
                existing = await db.execute(
                    select(SecurityEventModel.id).where(SecurityEventModel.fingerprint == evt.fingerprint)
                )
                if existing.scalar_one_or_none():
                    skipped_count += 1
                    continue

                db.add(evt)
                new_events.append(evt)
                parsed_count += 1

                observed_ips.add(evt.source_ip)
                if evt.username and evt.username != "unknown":
                    observed_users.add(evt.username)
                if evt.outcome == "failure":
                    failure_count += 1
                elif evt.outcome == "success":
                    success_count += 1

            await db.commit()

            # Pass new events through Detection Engine
            triggered_detections = []
            for evt in new_events:
                dets = await detection_engine.process_event(evt, db)
                if dets:
                    triggered_detections.extend(dets)

            await db.commit()

            # Correlate detections into incidents
            incident_count = 0
            if triggered_detections:
                for det in triggered_detections:
                    inc = await correlation_engine.correlate_detection(det, db)
                    if inc:
                        incident_count += 1
                await db.commit()

            # Build comprehensive analysis summary
            analysis_summary = {
                "fileId": file_id,
                "filename": safe_name,
                "fileHash": file_hash,
                "formatDetected": format_detected,
                "logSource": log_source,
                "totalRecords": len(raw_lines),
                "parsedRecords": parsed_count,
                "failedRecords": failed_count,
                "skippedDuplicates": skipped_count,
                "uniqueSourceIps": sorted(list(observed_ips))[:20],
                "uniqueAccounts": sorted(list(observed_users))[:20],
                "failureCount": failure_count,
                "successCount": success_count,
                "detectionsCount": len(triggered_detections),
                "incidentsCreated": incident_count,
                "detectionNames": list(set(d.name for d in triggered_detections)) if triggered_detections else [],
                "completedAt": datetime.now(timezone.utc).isoformat()
            }

            file_record.parsed_count = parsed_count
            file_record.failed_count = failed_count
            file_record.skipped_count = skipped_count
            file_record.detection_count = len(triggered_detections)
            file_record.incident_count = incident_count
            file_record.analysis_summary = analysis_summary
            file_record.status = "completed"

            await db.commit()
            await db.refresh(file_record)
            return file_record

        except Exception as e:
            file_record.status = "failed"
            file_record.analysis_summary = {"error": str(e)}
            await db.commit()
            raise


file_ingest_service = FileIngestService()
