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
