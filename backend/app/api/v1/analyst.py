from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.schemas.analyst import AnalystQueryRequest, AnalystQueryResponse
from backend.app.services.analyst import ai_analyst_service

router = APIRouter(prefix="/analyst", tags=["Sentinel AI Analyst"])


@router.post("/query", response_model=AnalystQueryResponse)
async def query_analyst(payload: AnalystQueryRequest, db: AsyncSession = Depends(get_db)):
    return await ai_analyst_service.query(
        prompt=payload.prompt,
        incident_id=payload.contextIncidentId,
        db=db
    )
