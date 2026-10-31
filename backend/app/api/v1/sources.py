from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.models.source import LogSourceModel

router = APIRouter(prefix="/sources", tags=["Administration: Log Sources"])


class LogSourceSchema(BaseModel):
    id: str
    name: str
    type: str
    status: str
    lastEventReceived: str
    eventsProcessed24h: int
    errorCount24h: int
    host: str
    port: int
    agentVersion: str
    format: str
    description: str

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[LogSourceSchema])
async def list_sources(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(LogSourceModel))
    models = res.scalars().all()
    return [
        LogSourceSchema(
            id=m.id,
            name=m.name,
            type=m.type,
            status=m.status,
            lastEventReceived=m.last_event_received.isoformat() if hasattr(m.last_event_received, "isoformat") else str(m.last_event_received),
            eventsProcessed24h=m.events_processed_24h,
            errorCount24h=m.error_count_24h,
            host=m.host,
            port=m.port,
            agentVersion=m.agent_version,
            format=m.format,
            description=m.description
        )
        for m in models
    ]
