from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class ConversationModel(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False, default="New Security Investigation")
    user_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    context_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    messages: Mapped[List["ChatMessageModel"]] = relationship(
        "ChatMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessageModel.created_at"
    )
    uploaded_files: Mapped[List["UploadedFileModel"]] = relationship(
        "UploadedFileModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="UploadedFileModel.created_at"
    )

    __table_args__ = (
        Index("ix_chat_conversations_user_updated", "user_id", "updated_at"),
    )


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text, nullable=False)
    thought_process: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tool_calls: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    evidence_references: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    suggested_actions: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    conversation: Mapped["ConversationModel"] = relationship("ConversationModel", back_populates="messages")

    __table_args__ = (
        Index("ix_chat_messages_conv_created", "conversation_id", "created_at"),
    )


class UploadedFileModel(Base):
    __tablename__ = "chat_uploaded_files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # SHA-256
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    format_detected: Mapped[str] = mapped_column(String(64), nullable=False, default="generic_log")
    log_source: Mapped[str] = mapped_column(String(64), nullable=False, default="file_upload")
    record_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parsed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    detection_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    incident_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="uploaded", index=True, nullable=False)  # uploaded, processing, completed, failed
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    analysis_summary: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    user_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)

    conversation: Mapped["ConversationModel"] = relationship("ConversationModel", back_populates="uploaded_files")

    __table_args__ = (
        Index("ix_chat_uploaded_files_conv", "conversation_id", "created_at"),
        Index("ix_chat_uploaded_files_hash", "file_hash"),
    )

