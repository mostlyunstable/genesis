from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.models.audit import AuditRecordModel

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
    isSimulated: bool

    model_config = ConfigDict(from_attributes=True)


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
            isSimulated=m.is_simulated
        )
        for m in models
    ]
