import json
import httpx
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from datetime import datetime, timezone
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.models.chat import ConversationModel, ChatMessageModel, UploadedFileModel
from backend.app.schemas.chat import (
    ConversationSummarySchema,
    ConversationDetailSchema,
    ChatMessageSchema,
    UploadedFileSummarySchema,
    CreateConversationRequest,
    UpdateConversationRequest,
    SendMessageRequest,
    ConfirmActionRequest
)
from backend.app.services.chat import chat_copilot_service
from backend.app.services.file_ingest import file_ingest_service, MAX_FILE_SIZE
from backend.app.services.response import response_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["Security Copilot Chat"])


def _to_message_schema(m: ChatMessageModel) -> ChatMessageSchema:
    return ChatMessageSchema(
        id=m.id,
        conversationId=m.conversation_id,
        role=m.role,
        content=m.content,
        thoughtProcess=m.thought_process,
        toolCalls=m.tool_calls or [],
        evidenceReferences=m.evidence_references or [],
        suggestedActions=m.suggested_actions or [],
        createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        tokenCount=m.token_count
    )


def _to_file_schema(f: UploadedFileModel) -> UploadedFileSummarySchema:
    return UploadedFileSummarySchema(
        id=f.id,
        conversationId=f.conversation_id,
        filename=f.filename,
        fileHash=f.file_hash,
        fileSize=f.file_size,
        formatDetected=f.format_detected,
        logSource=f.log_source,
        recordCount=f.record_count,
        parsedCount=f.parsed_count,
        failedCount=f.failed_count,
        skippedCount=f.skipped_count,
        detectionCount=f.detection_count,
        incidentCount=f.incident_count,
        status=f.status,
        analysisSummary=f.analysis_summary or {},
        createdAt=f.created_at.isoformat() if hasattr(f.created_at, "isoformat") else str(f.created_at),
        userId=f.user_id
    )


@router.get("/model")
async def get_chat_model(current_user=Depends(get_current_user)):
    available = False
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(settings.OLLAMA_BASE_URL + "/api/tags")
            response.raise_for_status()
            available = any(m.get("name") == settings.OLLAMA_MODEL for m in response.json().get("models", []))
    except (httpx.HTTPError, ValueError, TypeError):
        pass
    return {"provider": "Ollama", "model": settings.OLLAMA_MODEL, "available": available}


@router.post("/conversations", response_model=ConversationSummarySchema)
async def create_conversation(
    payload: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new security investigation conversation."""
    user_id = current_user.id if hasattr(current_user, "id") else None
    conv = await chat_copilot_service.get_or_create_conversation(
        conversation_id=None,
        db=db,
        user_id=user_id,
        title=payload.title,
        context_metadata=payload.contextMetadata
    )
    return ConversationSummarySchema(
        id=conv.id,
        title=conv.title,
        userId=conv.user_id,
        createdAt=conv.created_at.isoformat(),
        updatedAt=conv.updated_at.isoformat(),
        isPinned=conv.is_pinned,
        messageCount=0,
        lastMessageSnippet=None,
        contextMetadata=conv.context_metadata or {}
    )


@router.get("/conversations", response_model=List[ConversationSummarySchema])
async def list_conversations(
    query: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List persistent conversations for current user, ordered by most recently updated."""
    user_id = current_user.id if hasattr(current_user, "id") else None
    user_role = getattr(current_user, "role", "")
    stmt = select(ConversationModel).options(selectinload(ConversationModel.messages))

    if user_id and user_role != "admin":
        stmt = stmt.where(or_(ConversationModel.user_id == user_id, ConversationModel.user_id.is_(None)))

    if query:
        q = f"%{query.strip().lower()}%"
        stmt = stmt.where(ConversationModel.title.ilike(q))

    stmt = stmt.order_by(desc(ConversationModel.is_pinned), desc(ConversationModel.updated_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    convs = res.scalars().all()

    items = []
    for c in convs:
        last_msg = c.messages[-1].content[:60] if c.messages else None
        items.append(
            ConversationSummarySchema(
                id=c.id,
                title=c.title,
                userId=c.user_id,
                createdAt=c.created_at.isoformat(),
                updatedAt=c.updated_at.isoformat(),
                isPinned=c.is_pinned,
                messageCount=len(c.messages),
                lastMessageSnippet=last_msg,
                contextMetadata=c.context_metadata or {}
            )
        )
    return items


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailSchema)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve complete conversation details, messages, and uploaded files."""
    stmt = (
        select(ConversationModel)
        .where(ConversationModel.id == conversation_id)
        .options(selectinload(ConversationModel.messages), selectinload(ConversationModel.uploaded_files))
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": f"Conversation {conversation_id} not found."}
        )

    user_id = current_user.id if hasattr(current_user, "id") else None
    user_role = getattr(current_user, "role", "")
    if user_id and conv.user_id and conv.user_id != user_id and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have permission to view this conversation."}
        )

    return ConversationDetailSchema(
        id=conv.id,
        title=conv.title,
        userId=conv.user_id,
        createdAt=conv.created_at.isoformat(),
        updatedAt=conv.updated_at.isoformat(),
        isPinned=conv.is_pinned,
        contextMetadata=conv.context_metadata or {},
        messages=[_to_message_schema(m) for m in conv.messages],
        uploadedFiles=[_to_file_schema(f) for f in (conv.uploaded_files or [])]
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationSummarySchema)
async def update_conversation(
    conversation_id: str,
    payload: UpdateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update conversation title or pinned status."""
    res = await db.execute(select(ConversationModel).where(ConversationModel.id == conversation_id))
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": f"Conversation {conversation_id} not found."}
        )

    user_id = current_user.id if hasattr(current_user, "id") else None
    if user_id and conv.user_id and conv.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have permission to modify this conversation."}
        )

    if payload.title is not None:
        conv.title = payload.title.strip()
    if payload.isPinned is not None:
        conv.is_pinned = payload.isPinned

    await db.commit()
    await db.refresh(conv)

    return ConversationSummarySchema(
        id=conv.id,
        title=conv.title,
        userId=conv.user_id,
        createdAt=conv.created_at.isoformat(),
        updatedAt=conv.updated_at.isoformat(),
        isPinned=conv.is_pinned,
        messageCount=0,
        lastMessageSnippet=None,
        contextMetadata=conv.context_metadata or {}
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Permanently delete a conversation and its messages."""
    res = await db.execute(select(ConversationModel).where(ConversationModel.id == conversation_id))
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": f"Conversation {conversation_id} not found."}
        )

    user_id = current_user.id if hasattr(current_user, "id") else None
    if user_id and conv.user_id and conv.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You do not have permission to delete this conversation."}
        )

    await db.delete(conv)
    await db.commit()
    return {"status": "DELETED", "conversationId": conversation_id}


@router.post("/conversations/{conversation_id}/upload", response_model=UploadedFileSummarySchema, status_code=status.HTTP_201_CREATED)
async def upload_file_to_conversation(
    conversation_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Upload and ingest cybersecurity logs or datasets (CSV, JSON, JSONL, TXT, LOG, Syslog).
    Extracts events, runs detection heuristics, and produces an investigation summary.
    """
    user_id = current_user.id if hasattr(current_user, "id") else None
    conv = await chat_copilot_service.get_or_create_conversation(
        conversation_id=conversation_id,
        db=db,
        user_id=user_id
    )

    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Uploaded log exceeds the 50 MB limit.")
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_FILE", "message": "Uploaded file is empty."}
        )

    try:
        file_record = await file_ingest_service.ingest_file(
            conversation_id=conv.id,
            filename=file.filename or "uploaded.log",
            content=content,
            db=db,
            user_id=user_id
        )

        conv.updated_at = datetime.now(timezone.utc)
        await db.commit()

        return _to_file_schema(file_record)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE", "message": str(ve)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INGEST_ERROR", "message": f"File ingestion failed: {str(e)}"}
        )


class StopReplyRequest(BaseModel):
    content: str = Field(default="", max_length=100000)
    reason: Literal["stopped", "interrupted"] = "stopped"


@router.post("/conversations/{conversation_id}/messages/{message_id}/stop")
async def stop_reply(
    conversation_id: str, message_id: str, payload: StopReplyRequest,
    db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)
):
    conv = await db.get(ConversationModel, conversation_id)
    if not conv or (conv.user_id and conv.user_id != current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    message = await db.get(ChatMessageModel, message_id)
    if not message or message.conversation_id != conversation_id or message.role != "assistant":
        raise HTTPException(status_code=404, detail="Reply not found.")
    if message.thought_process != "generating":
        return {"status": "completed"}
    if message.content:
        message.tool_calls = (message.tool_calls or []) + [{
            "tool": "previous_response", "content": message.content,
            "generatedAt": message.created_at.isoformat()
        }]
    label = "Generation stopped" if payload.reason == "stopped" else "Connection interrupted"
    message.content = payload.content + f"\n\n*({label})*"
    message.thought_process = "interrupted"
    message.evidence_references = []
    message.suggested_actions = []
    message.token_count = len(payload.content.split())
    await db.commit()
    return {"status": "stopped"}


@router.get("/conversations/{conversation_id}/files", response_model=List[UploadedFileSummarySchema])
async def list_conversation_files(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all uploaded telemetry files and datasets associated with a conversation."""
    stmt = (
        select(UploadedFileModel)
        .where(UploadedFileModel.conversation_id == conversation_id)
        .order_by(desc(UploadedFileModel.created_at))
    )
    res = await db.execute(stmt)
    files = res.scalars().all()
    return [_to_file_schema(f) for f in files]


@router.get("/files/{file_id}", response_model=UploadedFileSummarySchema)
async def get_file_details(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve detailed parsing metrics and analysis summary for an uploaded file."""
    res = await db.execute(select(UploadedFileModel).where(UploadedFileModel.id == file_id))
    f = res.scalar_one_or_none()
    if not f:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FILE_NOT_FOUND", "message": f"File {file_id} not found."}
        )
    return _to_file_schema(f)


@router.post("/conversations/{conversation_id}/stream")
async def stream_conversation_message(
    conversation_id: str,
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Emits real-time multi-step investigation events:
    - event: step (investigation stage)
    - event: evidence (retrieved grounded records)
    - event: actions (proposed defensive responses)
    - event: token (incremental text chunks)
    - event: done (message completion & persistence)
    """
    user_id = current_user.id if hasattr(current_user, "id") else None
    conv = await chat_copilot_service.get_or_create_conversation(
        conversation_id=conversation_id,
        db=db,
        user_id=user_id
    )

    if payload.retryMessageId:
        previous = await db.get(ChatMessageModel, payload.retryMessageId)
        if not previous or previous.conversation_id != conv.id or previous.role != "assistant":
            raise HTTPException(status_code=404, detail="Reply not found.")

    generator = chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text=payload.message,
        db=db,
        user_id=user_id,
        context_incident_id=payload.contextIncidentId,
        context_asset_id=payload.contextAssetId,
        retry_message_id=payload.retryMessageId,
        context_file_id=payload.contextFileId
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageSchema)
async def send_message_sync(
    conversation_id: str,
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Non-streaming fallback for message submission.
    Executes the full investigation and returns the completed assistant message.
    """
    user_id = current_user.id if hasattr(current_user, "id") else None
    conv = await chat_copilot_service.get_or_create_conversation(
        conversation_id=conversation_id,
        db=db,
        user_id=user_id
    )

    # Consume stream into completed state
    last_msg_id = None
    if payload.retryMessageId:
        previous = await db.get(ChatMessageModel, payload.retryMessageId)
        if not previous or previous.conversation_id != conv.id or previous.role != "assistant":
            raise HTTPException(status_code=404, detail="Reply not found.")

    generator = chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text=payload.message,
        db=db,
        user_id=user_id,
        context_incident_id=payload.contextIncidentId,
        context_asset_id=payload.contextAssetId,
        retry_message_id=payload.retryMessageId,
        context_file_id=payload.contextFileId
    )

    async for chunk in generator:
        if "event: done" in chunk:
            for line in chunk.split("\n"):
                if line.startswith("data:"):
                    data = json.loads(line[5:].strip())
                    last_msg_id = data.get("messageId")

    if not last_msg_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "CHAT_ERROR", "message": "Failed to complete message processing"}
        )

    res = await db.execute(select(ChatMessageModel).where(ChatMessageModel.id == last_msg_id))
    asst_msg = res.scalar_one_or_none()
    return _to_message_schema(asst_msg)


@router.post("/actions/confirm")
async def confirm_action(
    payload: ConfirmActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Confirm or reject a proposed defensive response action.
    Read-only investigation is default; destructive/containment actions require explicit authorization.
    """
    actor = current_user.username if hasattr(current_user, "username") else "secops_analyst"

    if not payload.confirmed:
        return {
            "status": "REJECTED_BY_USER",
            "message": f"Response action '{payload.actionName}' targeting {payload.target} was cancelled by analyst.",
            "actionProposalId": payload.actionProposalId
        }

    # Execute approved action safely via response_service
    ok, action_record, reason = await response_service.execute_action(
        playbook_id=payload.playbookId,
        action_name=payload.actionName,
        target=payload.target,
        incident_id=payload.incidentId,
        actor=actor,
        db=db
    )

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ACTION_BLOCKED", "message": reason}
        )

    return {
        "status": "EXECUTED",
        "actionId": action_record.id,
        "playbookId": payload.playbookId,
        "actionName": payload.actionName,
        "target": payload.target,
        "details": action_record.details,
        "verificationStatus": action_record.verification_status
    }
