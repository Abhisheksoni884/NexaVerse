"""
models/chat.py — Pydantic models for chat requests, responses, and citations.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Citation(BaseModel):
    document_name: str
    page_number: int
    excerpt: str
    document_id: str
    chunk_id: str


class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # History of prior turns for multi-turn context
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[Citation] = []
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ConversationHistory(BaseModel):
    session_id: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
