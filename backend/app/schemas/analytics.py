from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict


class EventsTimelinePoint(BaseModel):
    timestamp: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class MitreTechniqueCount(BaseModel):
    techniqueId: str
    name: str
    tactic: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class SystemHealthSummary(BaseModel):
    databaseConnected: bool
    databaseLatencyMs: float
    activeForwarders: int
    defenseStatus: str

    model_config = ConfigDict(from_attributes=True)


class OverviewMetricsResponse(BaseModel):
    totalEvents: int
    eventsOverTime: List[EventsTimelinePoint]
    activeIncidents: int
    openInvestigations: int
    resolvedIncidents: int
    incidentSeverityDistribution: Dict[str, int]
    totalDetections: int
    criticalDetections: int
    detectionsByCategory: Dict[str, int]
    mitreTechniqueDistribution: List[MitreTechniqueCount]
    responseActionsSummary: Dict[str, int]
    totalActionsTaken: int
    systemHealth: SystemHealthSummary
    lastUpdated: str

    model_config = ConfigDict(from_attributes=True)
