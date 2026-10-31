from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.models.threat_intel import ThreatIntelModel

router = APIRouter(prefix="/threat-intel", tags=["Administration: Threat Intelligence"])


class ThreatIntelSchema(BaseModel):
    ip: str
    threatClassification: str
    reputationScore: int
    associatedIncidents: List[str]
    firstSeen: str
    lastSeen: str
    confidence: int
    country: str
    countryCode: str
    asn: str
    mitreTechniques: List[str]
    tags: List[str]
    simulatedDataSource: str

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[ThreatIntelSchema])
async def list_threat_intel(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ThreatIntelModel))
    models = res.scalars().all()
    return [
        ThreatIntelSchema(
            ip=m.ip,
            threatClassification=m.threat_classification,
            reputationScore=m.reputation_score,
            associatedIncidents=m.associated_incidents or [],
            firstSeen=m.first_seen.isoformat() if hasattr(m.first_seen, "isoformat") else str(m.first_seen),
            lastSeen=m.last_seen.isoformat() if hasattr(m.last_seen, "isoformat") else str(m.last_seen),
            confidence=m.confidence,
            country=m.country,
            countryCode=m.country_code,
            asn=m.asn,
            mitreTechniques=m.mitre_techniques or [],
            tags=m.tags or [],
            simulatedDataSource=m.simulated_data_source
        )
        for m in models
    ]


@router.get("/{ip}", response_model=ThreatIntelSchema)
async def get_threat_intel_by_ip(ip: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ThreatIntelModel).where(ThreatIntelModel.ip == ip))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INDICATOR_NOT_FOUND", "message": f"Threat intel for {ip} not found"}
        )
    return ThreatIntelSchema(
        ip=m.ip,
        threatClassification=m.threat_classification,
        reputationScore=m.reputation_score,
        associatedIncidents=m.associated_incidents or [],
        firstSeen=m.first_seen.isoformat() if hasattr(m.first_seen, "isoformat") else str(m.first_seen),
        lastSeen=m.last_seen.isoformat() if hasattr(m.last_seen, "isoformat") else str(m.last_seen),
        confidence=m.confidence,
        country=m.country,
        countryCode=m.country_code,
        asn=m.asn,
        mitreTechniques=m.mitre_techniques or [],
        tags=m.tags or [],
        simulatedDataSource=m.simulated_data_source
    )
