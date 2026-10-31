from typing import List, Optional
from pydantic import BaseModel, Field


class AnalystQueryRequest(BaseModel):
    prompt: str = Field(..., description="Analyst question or investigation prompt")
    contextIncidentId: Optional[str] = Field(None, description="Optional incident ID for context retrieval")


class AnalystQueryResponse(BaseModel):
    reply: str
    referencedEventIds: List[str]
    mitreTechniques: List[str]
    recommendedPlaybookId: Optional[str] = None
    confidence: float
