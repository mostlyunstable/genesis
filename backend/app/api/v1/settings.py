from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from backend.app.db.session import get_db
from backend.app.models.settings import SettingsModel
from backend.app.models.audit import AuditRecordModel
from backend.app.api.deps import get_current_user
import time
from datetime import datetime, timezone

router = APIRouter(prefix="/settings", tags=["Administration: Settings"])


class DetectionThresholdConfigSchema(BaseModel):
    sshFailedAttemptThreshold: int
    sshWindowSeconds: int
    passwordSprayUniqueUsersThreshold: int
    passwordSprayWindowSeconds: int
    distributedThresholdIps: int
    autonomousResponseEnabled: bool
    requireApprovalForCritical: bool
    temporaryIpBlockDurationMinutes: int

    model_config = ConfigDict(from_attributes=True)


class UpdateThresholdConfigRequest(BaseModel):
    sshFailedAttemptThreshold: Optional[int] = None
    sshWindowSeconds: Optional[int] = None
    passwordSprayUniqueUsersThreshold: Optional[int] = None
    passwordSprayWindowSeconds: Optional[int] = None
    distributedThresholdIps: Optional[int] = None
    autonomousResponseEnabled: Optional[bool] = None
    requireApprovalForCritical: Optional[bool] = None
    temporaryIpBlockDurationMinutes: Optional[int] = None


@router.get("/thresholds", response_model=DetectionThresholdConfigSchema)
async def get_thresholds(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
    st = res.scalar_one_or_none()
    if not st:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SETTINGS_NOT_FOUND", "message": "Platform settings not initialized"}
        )

    return DetectionThresholdConfigSchema(
        sshFailedAttemptThreshold=st.ssh_failed_attempt_threshold,
        sshWindowSeconds=st.ssh_window_seconds,
        passwordSprayUniqueUsersThreshold=st.password_spray_unique_users_threshold,
        passwordSprayWindowSeconds=st.password_spray_window_seconds,
        distributedThresholdIps=st.distributed_threshold_ips,
        autonomousResponseEnabled=st.autonomous_response_enabled,
        requireApprovalForCritical=st.require_approval_for_critical,
        temporaryIpBlockDurationMinutes=st.temporary_ip_block_duration_minutes
    )


@router.put("/thresholds", response_model=DetectionThresholdConfigSchema)
async def update_thresholds(
    payload: UpdateThresholdConfigRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    res = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
    st = res.scalar_one_or_none()
    if not st:
        st = SettingsModel(id=1)
        db.add(st)

    updates = payload.model_dump(exclude_unset=True)
    if "sshFailedAttemptThreshold" in updates:
        st.ssh_failed_attempt_threshold = updates["sshFailedAttemptThreshold"]
    if "sshWindowSeconds" in updates:
        st.ssh_window_seconds = updates["sshWindowSeconds"]
    if "passwordSprayUniqueUsersThreshold" in updates:
        st.password_spray_unique_users_threshold = updates["passwordSprayUniqueUsersThreshold"]
    if "passwordSprayWindowSeconds" in updates:
        st.password_spray_window_seconds = updates["passwordSprayWindowSeconds"]
    if "distributedThresholdIps" in updates:
        st.distributed_threshold_ips = updates["distributedThresholdIps"]
    if "autonomousResponseEnabled" in updates:
        st.autonomous_response_enabled = updates["autonomousResponseEnabled"]
    if "requireApprovalForCritical" in updates:
        st.require_approval_for_critical = updates["requireApprovalForCritical"]
    if "temporaryIpBlockDurationMinutes" in updates:
        st.temporary_ip_block_duration_minutes = updates["temporaryIpBlockDurationMinutes"]

    # Audit the change
    actor = current_user.username if current_user else "secops_admin@sentinel.ai"
    audit = AuditRecordModel(
        id=f"AUD-{int(time.time()*1000)%100000:05d}",
        timestamp=datetime.now(timezone.utc),
        category="CONFIG_CHANGE",
        action="DETECTION_THRESHOLDS_UPDATED",
        actor=actor,
        target="DetectionThresholdConfig",
        result="INFO",
        details=updates,
        is_simulated=True
    )
    db.add(audit)
    await db.commit()

    return DetectionThresholdConfigSchema(
        sshFailedAttemptThreshold=st.ssh_failed_attempt_threshold,
        sshWindowSeconds=st.ssh_window_seconds,
        passwordSprayUniqueUsersThreshold=st.password_spray_unique_users_threshold,
        passwordSprayWindowSeconds=st.password_spray_window_seconds,
        distributedThresholdIps=st.distributed_threshold_ips,
        autonomousResponseEnabled=st.autonomous_response_enabled,
        requireApprovalForCritical=st.require_approval_for_critical,
        temporaryIpBlockDurationMinutes=st.temporary_ip_block_duration_minutes
    )
