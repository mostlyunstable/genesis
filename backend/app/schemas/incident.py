from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict


class MitreTechniqueSchema(BaseModel):
    tactic: str
    techniqueId: str
    techniqueName: str
    subtechnique: Optional[str] = None
    referenceUrl: str


class TimelineEventSchema(BaseModel):
    id: str
    timestamp: str
    stage: str
    title: str
    description: str
    severity: str
    evidenceId: Optional[str] = None
    type: str = "event"


class AISummarySchema(BaseModel):
    executiveSummary: str
    evidenceChain: List[str]
    rootCauseAnalysis: str
    recommendedActions: List[str]
    confidenceExplanation: str


class UpdateIncidentStatusRequest(BaseModel):
    status: str  # active, investigating, contained, resolved, dismissed


class IncidentSchema(BaseModel):
    id: str
    title: str
    category: str
    severity: str
    status: str
    riskScore: int
    confidenceScore: int
    sourceIps: List[str]
    targetAccounts: List[str]
    eventCount: int
    createdAt: str
    updatedAt: str
    detectionIds: List[str]
    eventIds: List[str]
    detectionExplanation: str
    mitreAttack: List[MitreTechniqueSchema]
    aiSummary: AISummarySchema
    timelineEvents: List[TimelineEventSchema]
    assignedPlaybookId: Optional[str] = None
    isSimulated: bool = True

    model_config = ConfigDict(from_attributes=True)


class IncidentListResponse(BaseModel):
    items: List[IncidentSchema]
    total: int
