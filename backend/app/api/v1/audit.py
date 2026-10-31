from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.models.audit import AuditRecordModel
from backend.app.services.audit import audit_service

router = APIRouter(prefix="/audit", tags=["Administration: Audit Trail"])


class AuditRecordSchema(BaseModel):
    id: str
    timestamp: str
    category: str
    action: str
    actor: str
    target: str
    result: str
    details: Dict[str, Any]
    previousHash: Optional[str] = None
    recordHash: Optional[str] = None
    isSimulated: bool

    model_config = ConfigDict(from_attributes=True)


class AuditChainVerificationResponse(BaseModel):
    verified: bool
    totalRecords: int
    tamperedCount: int
    tamperedRecords: List[Dict[str, Any]]
    status: str
    latestHash: Optional[str] = None


@router.get("/verify", response_model=AuditChainVerificationResponse)
async def verify_audit_trail(db: AsyncSession = Depends(get_db)):
    """
    Cryptographic verification of audit trail integrity.
    Validates SHA-256 hash chaining pointers and record digest recalculation.
    """
    return await audit_service.verify_chain(db)


@router.get("", response_model=List[AuditRecordSchema])
async def list_audit_records(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AuditRecordModel).order_by(desc(AuditRecordModel.timestamp)).limit(500))
    models = res.scalars().all()
    return [
        AuditRecordSchema(
            id=m.id,
            timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            category=m.category,
            action=m.action,
            actor=m.actor,
            target=m.target,
            result=m.result,
            details=m.details or {},
            previousHash=m.previous_hash,
            recordHash=m.record_hash,
            isSimulated=m.is_simulated
        )
        for m in models
    ]
