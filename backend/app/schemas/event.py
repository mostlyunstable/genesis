from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class RawLogItem(BaseModel):
    timestamp: Optional[datetime] = None
    raw: str = Field(..., description="Raw syslog line or structured JSON string")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class IngestBatchRequest(BaseModel):
    source: str = Field(..., description="linux_ssh, linux_auth, windows_security, app_auth, nginx_access")
    logs: List[RawLogItem] = Field(..., description="List of raw logs to ingest")


class IngestBatchResponse(BaseModel):
    status: str
    receivedCount: int
    normalizedCount: int
    duplicateCount: int
    droppedCount: int


class SecurityEventSchema(BaseModel):
    id: str
    timestamp: str
    source: str
    eventType: str
    username: str
    sourceIp: str
    destinationIp: str
    destinationPort: int
    outcome: str
    severity: str
    rawEvent: str
    parsedFields: Dict[str, Any]
    correlationId: Optional[str] = None
    isSimulated: bool = True

    model_config = ConfigDict(from_attributes=True)


class EventListResponse(BaseModel):
    items: List[SecurityEventSchema]
    total: int
