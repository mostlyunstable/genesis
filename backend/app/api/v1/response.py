from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.models.settings import SettingsModel
from backend.app.schemas.response import (
    ResponsePlaybookSchema,
    ResponseActionSchema,
    ExecuteActionRequest,
    ExecuteActionResponse,
    RollbackResponse,
    EmergencyToggleRequest,
    EmergencyToggleResponse
)
from backend.app.services.response import response_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/response", tags=["Autonomous Response & SOAR"])


@router.get("/playbooks", response_model=List[ResponsePlaybookSchema])
async def list_playbooks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ResponsePlaybookModel))
    models = res.scalars().all()
    return [
        ResponsePlaybookSchema(
            id=m.id,
            name=m.name,
            description=m.description,
            severityTrigger=m.severity_trigger or [],
            triggers=m.triggers or [],
            investigationRequirements=m.investigation_requirements or [],
            responseSteps=m.response_steps or [],
            allowedScope=m.allowed_scope,
            verificationSteps=m.verification_steps or [],
            rollbackStrategy=m.rollback_strategy,
            enabled=m.enabled,
            executionCount=m.execution_count
        )
        for m in models
    ]


@router.get("/actions", response_model=List[ResponseActionSchema])
async def list_actions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ResponseActionModel).order_by(desc(ResponseActionModel.timestamp)))
    models = res.scalars().all()
    return [
        ResponseActionSchema(
            id=m.id,
            incidentId=m.incident_id,
            playbookId=m.playbook_id,
            actionName=m.action_name,
            target=m.target,
            status=m.status,
            executionMode=m.execution_mode,
            timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            durationMs=m.duration_ms,
            details=m.details,
            verificationStatus=m.verification_status,
            rollbackAvailable=m.rollback_available,
            isSimulated=m.is_simulated
        )
        for m in models
    ]


@router.post("/execute", response_model=ExecuteActionResponse)
async def execute_action(
    payload: ExecuteActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    actor = current_user.username if current_user else "secops_analyst@sentinel.ai"
    success, action_rec, message = await response_service.execute_action(
        playbook_id=payload.playbookId,
        action_name=payload.actionName,
        target=payload.target,
        incident_id=payload.incidentId,
        actor=actor,
        db=db
    )

    if not success or not action_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "POLICY_REJECTION", "message": message}
        )

    return ExecuteActionResponse(
        success=True,
        action=ResponseActionSchema(
            id=action_rec.id,
            incidentId=action_rec.incident_id,
            playbookId=action_rec.playbook_id,
            actionName=action_rec.action_name,
            target=action_rec.target,
            status=action_rec.status,
            executionMode=action_rec.execution_mode,
            timestamp=action_rec.timestamp.isoformat() if hasattr(action_rec.timestamp, "isoformat") else str(action_rec.timestamp),
            durationMs=action_rec.duration_ms,
            details=action_rec.details,
            verificationStatus=action_rec.verification_status,
            rollbackAvailable=action_rec.rollback_available,
            isSimulated=action_rec.is_simulated
        )
    )


@router.post("/actions/{action_id}/rollback", response_model=RollbackResponse)
async def rollback_action(
    action_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    actor = current_user.username if current_user else "secops_analyst@sentinel.ai"
    success, message = await response_service.rollback_action(action_id, actor, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ROLLBACK_FAILED", "message": message}
        )

    return RollbackResponse(
        success=True,
        actionId=action_id,
        status="rolled_back"
    )


@router.post("/emergency-toggle", response_model=EmergencyToggleResponse)
async def emergency_toggle(
    payload: EmergencyToggleRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    actor = current_user.username if current_user else "secops_analyst@sentinel.ai"
    next_state = await response_service.toggle_emergency_switch(payload.enabled, actor, db)
    return EmergencyToggleResponse(
        autonomousResponseGlobalEnabled=next_state,
        status="ACTIVE" if next_state else "EMERGENCY_HALT"
    )
