from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class EvidenceReferenceSchema(BaseModel):
    type: str  # event, incident, detection, mitre, threat_intel
    id: str
    title: str
    snippet: Optional[str] = None
    severity: Optional[str] = None
    timestamp: Optional[str] = None
    url: Optional[str] = None


class SuggestedActionSchema(BaseModel):
    id: str
    actionName: str
    target: str
    playbookId: str
    description: str
    requiresConfirmation: bool = True
    status: str = "pending"  # pending, confirmed, executed, rejected, blocked
    incidentId: Optional[str] = None


class ChatMessageSchema(BaseModel):
    id: str
    conversationId: str
    role: str  # user, assistant, system, tool
    content: str
    thoughtProcess: Optional[str] = None
    toolCalls: List[Dict[str, Any]] = []
    evidenceReferences: List[EvidenceReferenceSchema] = []
    suggestedActions: List[SuggestedActionSchema] = []
    createdAt: str
    tokenCount: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationSummarySchema(BaseModel):
    id: str
    title: str
    userId: Optional[str] = None
    createdAt: str
    updatedAt: str
    isPinned: bool = False
    messageCount: int = 0
    lastMessageSnippet: Optional[str] = None
    contextMetadata: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class UploadedFileSummarySchema(BaseModel):
    id: str
    conversationId: str
    filename: str
    fileHash: str
    fileSize: int
    formatDetected: str
    logSource: str
    recordCount: int
    parsedCount: int
    failedCount: int
    skippedCount: int
    detectionCount: int
    incidentCount: int
    status: str
    analysisSummary: Dict[str, Any] = {}
    createdAt: str
    userId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailSchema(BaseModel):
    id: str
    title: str
    userId: Optional[str] = None
    createdAt: str
    updatedAt: str
    isPinned: bool = False
    contextMetadata: Dict[str, Any] = {}
    messages: List[ChatMessageSchema] = []
    uploadedFiles: List[UploadedFileSummarySchema] = []

    model_config = ConfigDict(from_attributes=True)


class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=256)
    contextMetadata: Optional[Dict[str, Any]] = None


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=256)
    isPinned: Optional[bool] = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=64000)
    contextIncidentId: Optional[str] = None
    contextAssetId: Optional[str] = None
    contextFileId: Optional[str] = None


class ConfirmActionRequest(BaseModel):
    actionProposalId: str
    confirmed: bool
    incidentId: Optional[str] = None
    playbookId: str
    actionName: str
    target: str
