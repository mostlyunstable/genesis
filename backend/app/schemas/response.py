from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class ResponseStepSchema(BaseModel):
    stepNumber: int
    action: str
    targetType: str
    automated: bool
    requiresApproval: bool


class ResponsePlaybookSchema(BaseModel):
    id: str
    name: str
    description: str
    severityTrigger: List[str]
    triggers: List[str]
    investigationRequirements: List[str]
    responseSteps: List[ResponseStepSchema]
    allowedScope: str
    verificationSteps: List[str]
    rollbackStrategy: str
    enabled: bool
    executionCount: int

    model_config = ConfigDict(from_attributes=True)


class ResponseActionSchema(BaseModel):
    id: str
    incidentId: Optional[str] = None
    playbookId: str
    actionName: str
    target: str
    status: str
    executionMode: str
    timestamp: str
    durationMs: int
    details: str
    verificationStatus: str
    rollbackAvailable: bool
    isSimulated: bool

    model_config = ConfigDict(from_attributes=True)


class ExecuteActionRequest(BaseModel):
    playbookId: str
    actionName: str
    target: str
    incidentId: Optional[str] = None


class ExecuteActionResponse(BaseModel):
    success: bool
    action: ResponseActionSchema
    message: Optional[str] = None


class RollbackResponse(BaseModel):
    success: bool
    actionId: str
    status: str


class EmergencyToggleRequest(BaseModel):
    enabled: bool


class EmergencyToggleResponse(BaseModel):
    autonomousResponseGlobalEnabled: bool
    status: str
