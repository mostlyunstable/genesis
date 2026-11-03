from datetime import datetime, timezone
from typing import Dict, Any, Optional, AsyncGenerator
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.models.chat import ConversationModel
from backend.app.services.chat_tools import tool_registry


class ChatCopilotService:
    """Persistent conversations and local generative investigations."""
    def __init__(self):
        self.tools = tool_registry

    async def get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        db: AsyncSession,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationModel:
        if conversation_id:
            res = await db.execute(
                select(ConversationModel)
                .where(ConversationModel.id == conversation_id)
                .options(selectinload(ConversationModel.messages), selectinload(ConversationModel.uploaded_files))
            )
            conv = res.scalar_one_or_none()
            if conv:
                if user_id and conv.user_id and conv.user_id != user_id:
                    raise PermissionError("Access denied: You do not have permission to access this conversation.")
                return conv

        new_id = "conv_" + uuid4().hex
        conv = ConversationModel(
            id=new_id,
            title=title or "New Security Investigation",
            user_id=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            is_pinned=False,
            context_metadata=context_metadata or {}
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    async def process_message_stream(
        self,
        conversation: ConversationModel,
        user_message_text: str,
        db: AsyncSession,
        user_id: Optional[str] = None,
        context_incident_id: Optional[str] = None,
        context_asset_id: Optional[str] = None,
        context_file_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        from backend.app.services.local_chat import stream_local_chat

        async for event in stream_local_chat(
            conversation, user_message_text, db, context_file_id, context_incident_id
        ):
            yield event


chat_copilot_service = ChatCopilotService()
