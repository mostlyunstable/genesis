from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.report import ReportModel
from backend.app.schemas.report import (
    GenerateReportRequest,
    ReportSummarySchema,
    ReportDetailSchema,
    ReportListResponse
)
from backend.app.services.report import report_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Security Reports & Forensic Dossiers"])


def _to_summary_schema(r: ReportModel) -> ReportSummarySchema:
    return ReportSummarySchema(
        id=r.id,
        incidentId=r.incident_id,
        title=r.title,
        reportType=r.report_type,
        classification=r.classification,
        createdAt=r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
        generatedBy=r.generated_by,
        recordHash=r.record_hash,
        isSimulated=r.is_simulated
    )


def _to_detail_schema(r: ReportModel) -> ReportDetailSchema:
    return ReportDetailSchema(
        id=r.id,
        incidentId=r.incident_id,
        title=r.title,
        reportType=r.report_type,
        classification=r.classification,
        createdAt=r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
        generatedBy=r.generated_by,
        recordHash=r.record_hash,
        isSimulated=r.is_simulated,
        summary=r.summary,
        findings=r.findings or {},
        recommendations=r.recommendations or [],
        markdownContent=r.markdown_content
    )


@router.post("/generate", response_model=ReportDetailSchema, status_code=status.HTTP_201_CREATED)
async def generate_report_endpoint(
    payload: GenerateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Generates a cryptographically signed security forensic dossier or incident report.
    Grounded in real database events, detections, timeline provenances, and threat intelligence.
    """
    actor = current_user.username if hasattr(current_user, "username") else "secops_analyst@genesis.ai"
    report = await report_service.generate_report(
        target_id=payload.target_id,
        target_type=payload.target_type,
        report_type=payload.report_type,
        actor=actor,
        custom_notes=payload.custom_notes,
        db=db
    )
    return _to_detail_schema(report)


@router.get("", response_model=ReportListResponse)
async def list_reports(
    report_type: Optional[str] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lists all generated security reports with pagination and type filtering."""
    stmt = select(ReportModel)
    if report_type and report_type != "all":
        stmt = stmt.where(ReportModel.report_type == report_type.upper())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    stmt = stmt.order_by(desc(ReportModel.created_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    models = res.scalars().all()

    return ReportListResponse(
        items=[_to_summary_schema(m) for m in models],
        total=total
    )


@router.get("/{report_id}", response_model=ReportDetailSchema)
async def get_report_detail(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieves full forensic details and markdown text for a specific report."""
    res = await db.execute(select(ReportModel).where(ReportModel.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "REPORT_NOT_FOUND", "message": f"Report '{report_id}' was not found."}
        )
    return _to_detail_schema(report)


@router.get("/{report_id}/download")
async def download_report_export(
    report_id: str,
    export_format: str = Query("markdown", alias="format", description="markdown, json, csv, html"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Downloads report rendered in specified format:
    - `markdown`: Full markdown dossier with tables and integrity footer
    - `json`: Complete structured JSON export
    - `csv`: Structured CSV table of findings and recommendations
    - `html`: Clean printable document ready for browser PDF export
    """
    res = await db.execute(select(ReportModel).where(ReportModel.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "REPORT_NOT_FOUND", "message": f"Report '{report_id}' was not found."}
        )

    try:
        content_bytes, media_type, filename = report_service.render_export(report, export_format)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FORMAT", "message": str(ve)}
        )

    return Response(
        content=content_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
