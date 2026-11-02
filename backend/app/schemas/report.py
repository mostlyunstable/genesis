from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class GenerateReportRequest(BaseModel):
    target_id: str = Field(..., description="Incident ID (e.g. INC-2026-XXXX), IP, or File ID")
    target_type: str = Field("incident", description="incident, ip, or file")
    report_type: str = Field("INCIDENT_DOSSIER", description="INCIDENT_DOSSIER, INVESTIGATION_SUMMARY, EXECUTIVE_BRIEF, AUDIT_COMPLIANCE")
    custom_notes: Optional[str] = Field(None, description="Optional analyst notes to incorporate")


class ReportSummarySchema(BaseModel):
    id: str
    incidentId: Optional[str] = None
    title: str
    reportType: str
    classification: str
    createdAt: str
    generatedBy: str
    recordHash: str
    isSimulated: bool = True


class ReportDetailSchema(ReportSummarySchema):
    summary: str
    findings: Dict[str, Any]
    recommendations: List[str]
    markdownContent: str


class ReportListResponse(BaseModel):
    items: List[ReportSummarySchema]
    total: int
