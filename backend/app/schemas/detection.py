from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class UpdateDetectionStatusRequest(BaseModel):
    status: str  # open, investigating, contained, resolved, false_positive


class DetectionSchema(BaseModel):
    id: str
    name: str
    category: str
    description: str
    severity: str
    sourceIp: str
    targetAccounts: List[str]
    eventCount: int
    timestamp: str
    confidence: float
    riskScore: float
    status: str
    triggeringConditions: List[str]
    supportingEventIds: List[str]
    ruleId: str
    ruleName: str
    associatedIncidentId: Optional[str] = None
    suggestedPlaybookId: Optional[str] = None
    isSimulated: bool = True

    model_config = ConfigDict(from_attributes=True)


class DetectionListResponse(BaseModel):
    items: List[DetectionSchema]
    total: int
