"""
routers/chat.py — RAG chat endpoint with SSE streaming.

The full RAG pipeline:
  1. Content Safety check on user input
  2. Generate query embedding
  3. Hybrid search (keyword + vector) with RBAC filters
  4. Build grounded prompt with retrieved context
  5. Stream GPT-5 response via SSE
  6. Content Safety check on output
  7. Log audit event + token usage

Endpoints:
  GET  /chat/stream          → SSE streaming RAG response
  GET  /chat/history/{sid}   → Get conversation history
  DELETE /chat/history/{sid} → Clear session history
"""
import json
import uuid
from datetime import datetime
from typing import List, AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from core.auth import get_current_user, get_current_user_from_query
from core.rbac import get_allowed_roles_for_search
from models.user import User
from models.chat import ChatRequest, ChatMessage, Citation, ConversationHistory
from models.audit import AuditLog, AuditAction, TokenUsageRecord
from services.openai_service import (
    generate_embedding,
    build_rag_prompt,
    get_chat_completion_with_usage,
    stream_chat_completion,
)
from services.search_service import hybrid_search
from services.content_safety import analyze_text, UNSAFE_RESPONSE_MESSAGE
from services.cosmos_service import write_audit_log, write_token_usage
from config import get_settings
from utils.logging import logger

router = APIRouter(prefix="/chat", tags=["Chat"])
settings = get_settings()

# In-memory conversation history (keyed by session_id)
# In production, persist this to Cosmos DB or Redis
_conversation_store: dict[str, ConversationHistory] = {}


def _get_or_create_session(session_id: str) -> ConversationHistory:
    if session_id not in _conversation_store:
        _conversation_store[session_id] = ConversationHistory(session_id=session_id)
    return _conversation_store[session_id]


def _history_to_messages(history: List[ChatMessage]) -> List[dict]:
    """Convert ConversationHistory messages to OpenAI message format."""
    # Keep only last N turns to stay within token limits
    recent = history[-10:]  # Last 5 turns (user + assistant)
    return [{"role": msg.role, "content": msg.content} for msg in recent]


async def _rag_stream_generator(
    query: str,
    session_id: str,
    current_user: User,
    request: Request,
) -> AsyncGenerator[str, None]:
    """
    Core RAG pipeline implemented as an async SSE generator.
    Yields SSE-formatted events.
    """
    # ── Step 1: Content safety on input ──────────────────────────────────────
    is_safe, reason = await analyze_text(query)
    if not is_safe:
        await write_audit_log(AuditLog(
            username=current_user.username,
            role=current_user.role,
            action=AuditAction.CONTENT_SAFETY_VIOLATION,
            resource="chat",
            session_id=session_id,
            details=f"Input violation: {reason}",
            success=False,
        ))
        yield f"data: {json.dumps({'type': 'error', 'content': UNSAFE_RESPONSE_MESSAGE})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # ── Step 2: Generate query embedding ─────────────────────────────────────
    try:
        query_embedding = await generate_embedding(query)
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': 'Failed to process query. Please try again.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # ── Step 3: Hybrid search with RBAC filter ────────────────────────────────
    allowed_roles = get_allowed_roles_for_search(current_user)
    chunks = await hybrid_search(
        query=query,
        query_embedding=query_embedding,
        allowed_roles=allowed_roles,
        top_k=settings.top_k_search_results,
    )

    # Emit citations metadata to the client before streaming content
    citations = [
        {
            "id": str(idx + 1),
            "document": c["document_name"],
            "page": c.get("page_number"),
            "excerpt": c["content"][:300] + "..." if len(c["content"]) > 300 else c["content"],
            "document_id": c["document_id"],
            "chunk_id": c["chunk_id"],
        }
        for idx, c in enumerate(chunks)
    ]
    yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

    # ── Step 4: Build grounded RAG prompt ─────────────────────────────────────
    session = _get_or_create_session(session_id)
    history_messages = _history_to_messages(session.messages)
    rag_messages = build_rag_prompt(
        query,
        chunks,
        user_name=current_user.username,
        user_role=current_user.role,
    )

    # ── Step 5: Stream the completion ─────────────────────────────────────────
    full_response = ""
    try:
        async for token in stream_chat_completion(rag_messages, history_messages, query):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    except Exception as e:
        logger.error(f"Chat completion streaming failed: {e}", exc_info=True)
        error_detail = str(e)
        if "model" in error_detail.lower() or "deployment" in error_detail.lower():
            error_msg = f"Model configuration error: {error_detail}"
        elif "auth" in error_detail.lower() or "401" in error_detail:
            error_msg = "Authentication error. Please check your Azure OpenAI credentials."
        else:
            error_msg = f"Response generation failed: {error_detail}"
        yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # ── Step 6: Content safety on output ─────────────────────────────────────
    output_safe, output_reason = await analyze_text(full_response)
    if not output_safe:
        await write_audit_log(AuditLog(
            username=current_user.username,
            role=current_user.role,
            action=AuditAction.CONTENT_SAFETY_VIOLATION,
            resource="chat_output",
            session_id=session_id,
            details=f"Output violation: {output_reason}",
            success=False,
        ))
        # Replace the streamed content (client must handle this event)
        yield f"data: {json.dumps({'type': 'replace', 'content': UNSAFE_RESPONSE_MESSAGE})}\n\n"
        full_response = UNSAFE_RESPONSE_MESSAGE

    # ── Step 7: Update conversation history ───────────────────────────────────
    session.messages.append(ChatMessage(role="user", content=query))
    session.messages.append(ChatMessage(role="assistant", content=full_response))
    session.updated_at = datetime.utcnow()

    # Approximate token usage (actual usage not available in streaming mode)
    # Rough estimate: 1 token ≈ 4 characters
    approx_prompt = sum(len(m["content"]) for m in rag_messages + history_messages + [{"content": query}]) // 4
    approx_completion = len(full_response) // 4
    approx_total = approx_prompt + approx_completion

    # ── Step 8: Log audit + token usage ──────────────────────────────────────
    await write_audit_log(AuditLog(
        username=current_user.username,
        role=current_user.role,
        action=AuditAction.CHAT_QUERY,
        resource="chat",
        session_id=session_id,
        details=f"Query: {query[:200]}",
        prompt_tokens=approx_prompt,
        completion_tokens=approx_completion,
        total_tokens=approx_total,
        success=True,
    ))

    await write_token_usage(TokenUsageRecord(
        username=current_user.username,
        role=current_user.role,
        operation="chat",
        model=settings.azure_openai_chat_deployment,
        prompt_tokens=approx_prompt,
        completion_tokens=approx_completion,
        total_tokens=approx_total,
        session_id=session_id,
    ))

    yield f"data: {json.dumps({'type': 'done', 'total_tokens': approx_total})}\n\n"
    yield "data: [DONE]\n\n"


@router.get("/stream")
async def chat_stream(
    message: str,
    session_id: str,
    token: Optional[str] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user_from_query),
):
    """
    Stream a RAG chat response using Server-Sent Events (SSE).

    SSE event types:
      - citations: List of source documents retrieved (sent first)
      - token: Streamed content tokens
      - error: An error occurred
      - replace: Replace buffered content (content safety violation on output)
      - done: Completion with total token count
    """
    logger.info(f"Chat stream request from user: {current_user.username}, message: {message[:50]}...")
    return StreamingResponse(
        _rag_stream_generator(
            query=message,
            session_id=session_id,
            current_user=current_user,
            request=request,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/history/{session_id}")
async def get_history(session_id: str, current_user: User = Depends(get_current_user)):
    """Get conversation history for a session."""
    session = _conversation_store.get(session_id)
    if not session:
        return {"session_id": session_id, "messages": []}
    return session


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(session_id: str, current_user: User = Depends(get_current_user)):
    """Clear conversation history for a session."""
    if session_id in _conversation_store:
        del _conversation_store[session_id]
