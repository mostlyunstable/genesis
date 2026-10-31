import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.audit import AuditRecordModel


def format_audit_timestamp(ts: datetime | str) -> str:
    """Normalize datetime or string to consistent UTC ISO format with trailing Z."""
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = ts.astimezone(timezone.utc)
    return ts.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def canonical_serialize(
    record_id: str,
    timestamp_iso: str,
    category: str,
    action: str,
    actor: str,
    target: str,
    result: str,
    details: Dict[str, Any],
    previous_hash: str
) -> str:
    """
    Produce a deterministic, whitespace-normalized canonical JSON representation
    for tamper-evident cryptographic hash generation.
    """
    payload = {
        "action": action,
        "actor": actor,
        "category": category,
        "details": details,
        "id": record_id,
        "previous_hash": previous_hash,
        "result": result,
        "target": target,
        "timestamp": format_audit_timestamp(timestamp_iso)
    }
    return json.dumps(payload, sort_keys=True, separators=(',', ':'))


def compute_hash(canonical_str: str) -> str:
    """Computes SHA-256 digest of canonical record string."""
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


_audit_counter: int = 0


class AuditService:
    """
    Cryptographic audit trail service with SHA-256 hash chaining.
    Guarantees tamper detection across the entire security decision and SOAR history.
    """
    @classmethod
    async def record_audit(
        cls,
        db: AsyncSession,
        category: str,
        action: str,
        actor: str,
        target: str,
        result: str,
        details: Dict[str, Any],
        is_simulated: bool = True
    ) -> AuditRecordModel:
        global _audit_counter
        _audit_counter += 1
        now = datetime.now(timezone.utc)
        record_id = f"AUD-{int(now.timestamp() * 1000) % 1000000:06d}-{_audit_counter:04d}"

        # Fetch latest record to obtain previous_hash for the chain
        res_latest = await db.execute(
            select(AuditRecordModel).order_by(desc(AuditRecordModel.timestamp), desc(AuditRecordModel.id)).limit(1)
        )
        latest_record = res_latest.scalar_one_or_none()
        previous_hash = (
            latest_record.record_hash
            if latest_record and latest_record.record_hash
            else "GENESIS_SENTINEL_AI_2026_BLOCK_0"
        )

        canonical = canonical_serialize(
            record_id=record_id,
            timestamp_iso=now.isoformat(),
            category=category,
            action=action,
            actor=actor,
            target=target,
            result=result,
            details=details,
            previous_hash=previous_hash
        )
        record_hash = compute_hash(canonical)

        record = AuditRecordModel(
            id=record_id,
            timestamp=now,
            category=category,
            action=action,
            actor=actor,
            target=target,
            result=result,
            details=details,
            previous_hash=previous_hash,
            record_hash=record_hash,
            is_simulated=is_simulated
        )
        db.add(record)
        return record

    @classmethod
    async def verify_chain(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Traverses the full audit trail from genesis to latest record,
        validating both the individual record hashes and the cryptographic link pointers.
        Returns detailed tamper status.
        """
        res = await db.execute(
            select(AuditRecordModel).order_by(asc(AuditRecordModel.timestamp), asc(AuditRecordModel.id))
        )
        records = res.scalars().all()

        if not records:
            return {
                "verified": True,
                "totalRecords": 0,
                "tamperedRecords": [],
                "status": "VALID",
                "message": "Audit log is empty."
            }

        tampered: List[Dict[str, Any]] = []
        expected_prev = "GENESIS_SENTINEL_AI_2026_BLOCK_0"

        for idx, rec in enumerate(records):
            # 1. Verify link pointer (previous_hash matches prior record's record_hash)
            if idx == 0:
                # First record may have GENESIS or a legacy None
                if rec.previous_hash and rec.previous_hash != expected_prev:
                    tampered.append({
                        "id": rec.id,
                        "error": "GENESIS_MISMATCH",
                        "expected": expected_prev,
                        "actual": rec.previous_hash
                    })
            else:
                if rec.previous_hash != expected_prev:
                    tampered.append({
                        "id": rec.id,
                        "error": "CHAIN_BROKEN",
                        "expectedPreviousHash": expected_prev,
                        "actualPreviousHash": rec.previous_hash
                    })

            # 2. Verify record hash integrity (recompute from content)
            if rec.record_hash:
                ts_iso = rec.timestamp.isoformat() if hasattr(rec.timestamp, "isoformat") else str(rec.timestamp)
                canonical = canonical_serialize(
                    record_id=rec.id,
                    timestamp_iso=ts_iso,
                    category=rec.category,
                    action=rec.action,
                    actor=rec.actor,
                    target=rec.target,
                    result=rec.result,
                    details=rec.details or {},
                    previous_hash=rec.previous_hash or expected_prev
                )
                computed = compute_hash(canonical)
                if computed != rec.record_hash:
                    tampered.append({
                        "id": rec.id,
                        "error": "PAYLOAD_TAMPERED",
                        "expectedHash": computed,
                        "recordedHash": rec.record_hash
                    })

            # Advance expected previous hash
            expected_prev = rec.record_hash or expected_prev

        is_valid = len(tampered) == 0
        return {
            "verified": is_valid,
            "totalRecords": len(records),
            "tamperedCount": len(tampered),
            "tamperedRecords": tampered,
            "status": "VALID" if is_valid else "TAMPERED",
            "latestHash": records[-1].record_hash if records else None
        }


audit_service = AuditService()
