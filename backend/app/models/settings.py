from sqlalchemy import Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class SettingsModel(Base):
    __tablename__ = "platform_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    ssh_failed_attempt_threshold: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    ssh_window_seconds: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    password_spray_unique_users_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    password_spray_window_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    distributed_threshold_ips: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    autonomous_response_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    require_approval_for_critical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    temporary_ip_block_duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
