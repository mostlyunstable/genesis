import json
from datetime import datetime, timezone
from typing import List, Optional
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
from backend.app.services.file_ingest import file_ingest_service
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
    stmt = select(ConversationModel).options(selectinload(ConversationModel.messages))

    if user_id:
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
    if user_id and conv.user_id and conv.user_id != user_id:
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

    content = await file.read()
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

        # Automatically insert user upload message and assistant analysis summary into chat thread
        import time
        from backend.app.models.chat import ChatMessageModel

        user_msg = ChatMessageModel(
            id=f"msg_{int(time.time()*1000)%1000000:06d}_u",
            conversation_id=conv.id,
            role="user",
            content=f"📎 Uploaded security log file `{file_record.filename}` ({file_record.file_size:,} bytes). Please analyze findings.",
            created_at=datetime.now(timezone.utc)
        )
        db.add(user_msg)

        fstats = file_record.analysis_summary or {}
        u_ips = fstats.get("uniqueSourceIps", [])
        u_users = fstats.get("uniqueAccounts", [])
        dets_count = fstats.get("detectionsCount", 0)
        inc_count = fstats.get("incidentsCreated", 0)

        asst_text = (
            f"### 📁 Autonomous Telemetry Analysis: `{file_record.filename}`\n\n"
            f"Successfully processed cybersecurity log dataset (SHA-256: `{file_record.file_hash[:16]}...`).\n\n"
            f"#### Ingestion & Normalization Metrics\n"
            f"- **Format Detected**: `{file_record.format_detected.upper()}` (`{file_record.log_source}`)\n"
            f"- **Total Records Analyzed**: `{fstats.get('totalRecords', 0)}`\n"
            f"- **Parsed Security Events**: `{fstats.get('parsedRecords', 0)}`\n"
            f"- **Failed / Dropped Records**: `{fstats.get('failedRecords', 0)}`\n\n"
            f"#### Forensic Authentication Findings\n"
            f"- **Failed Logon Attempts**: `{fstats.get('failureCount', 0)}`\n"
            f"- **Successful Authentications**: `{fstats.get('successCount', 0)}`" + 
            (f" (CRITICAL: Valid credentials acquired for user `{u_users[0] if u_users else 'account'}`!)" if fstats.get('successCount', 0) > 0 and fstats.get('failureCount', 0) >= 3 else "") + "\n"
            f"- **Adversary Source IPs**: {', '.join([f'`{ip}`' for ip in u_ips]) if u_ips else 'None'}\n"
            f"- **Targeted Accounts**: {', '.join([f'`{u}`' for u in u_users]) if u_users else 'None'}\n\n"
            f"#### Triggered Threat Detections\n"
            f"- **Detections Triggered**: `{dets_count}`\n"
            f"- **Correlated Incidents Created**: `{inc_count}`\n"
        )
        if fstats.get("detectionNames"):
            asst_text += "#### Detected Signatures\n" + "\n".join([f"- **{d}**" for d in fstats["detectionNames"]]) + "\n"

        asst_text += (
            f"\n#### Recommended Investigation Follow-ups:\n"
            f"1. *'Investigate the suspicious IP {u_ips[0] if u_ips else 'found'}'*\n"
            f"2. *'Which accounts were affected?'*\n"
            f"3. *'Was there any successful login?'*\n"
            f"4. *'Can you block the suspicious IP?'*\n"
        )

        asst_msg = ChatMessageModel(
            id=f"msg_{int(time.time()*1000)%1000000:06d}_a",
            conversation_id=conv.id,
            role="assistant",
            content=asst_text,
            created_at=datetime.now(timezone.utc),
            evidence_references=[
                {"type": "threat_intel", "id": ip, "title": f"Adversary IP: {ip}", "snippet": "Observed in uploaded log dataset"} for ip in u_ips[:3]
            ],
            suggested_actions=[
                {
                    "id": f"ACT-PROP-{int(time.time()*1000)%10000:04d}",
                    "actionName": "iptables drop",
                    "target": u_ips[0],
                    "playbookId": "PB-SSH-BRUTE-01",
                    "description": f"Enforce perimeter boundary DROP on adversary IP {u_ips[0]} (30-min TTL).",
                    "requiresConfirmation": True,
                    "status": "pending"
                }
            ] if (u_ips and dets_count > 0) else []
        )
        db.add(asst_msg)
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

    generator = chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text=payload.message,
        db=db,
        user_id=user_id,
        context_incident_id=payload.contextIncidentId,
        context_asset_id=payload.contextAssetId,
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
    generator = chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text=payload.message,
        db=db,
        user_id=user_id,
        context_incident_id=payload.contextIncidentId,
        context_asset_id=payload.contextAssetId,
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
