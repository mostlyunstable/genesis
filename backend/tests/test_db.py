import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.models.settings import SettingsModel
from backend.app.core.security import get_password_hash, verify_password


@pytest.mark.asyncio
async def test_user_model_crud(db_session: AsyncSession):
    raw_pwd = "strong_password_2026!"
    user = User(
        id="USR-TEST-01",
        username="analyst_test@sentinel.ai",
        full_name="Test Analyst",
        hashed_password=get_password_hash(raw_pwd),
        role="analyst",
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    await db_session.commit()

    # Query back
    result = await db_session.execute(select(User).where(User.username == "analyst_test@sentinel.ai"))
    fetched = result.scalar_one_or_none()
    assert fetched is not None
    assert fetched.full_name == "Test Analyst"
    assert verify_password(raw_pwd, fetched.hashed_password) is True
    assert verify_password("wrong_password", fetched.hashed_password) is False


@pytest.mark.asyncio
async def test_settings_model_crud(db_session: AsyncSession):
    settings_obj = SettingsModel(
        id=99,
        ssh_failed_attempt_threshold=15,
        ssh_window_seconds=180,
        password_spray_unique_users_threshold=8,
        password_spray_window_seconds=600,
        distributed_threshold_ips=4,
        autonomous_response_enabled=True,
        require_approval_for_critical=True,
        temporary_ip_block_duration_minutes=45
    )
    db_session.add(settings_obj)
    await db_session.commit()

    result = await db_session.execute(select(SettingsModel).where(SettingsModel.id == 99))
    fetched = result.scalar_one_or_none()
    assert fetched is not None
    assert fetched.ssh_failed_attempt_threshold == 15
    assert fetched.require_approval_for_critical is True
