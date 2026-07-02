"""
models/audit.py — Pydantic models for audit logs and token usage tracking.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class AuditAction(str):
    LOGIN = "login"
    LOGOUT = "logout"
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_DELETE = "document_delete"
    DOCUMENT_VIEW = "document_view"
    CHAT_QUERY = "chat_query"
    CONTENT_SAFETY_VIOLATION = "content_safety_violation"
    RBAC_ACCESS_DENIED = "rbac_access_denied"
    ADMIN_ACTION = "admin_action"
    CATEGORY_CHANGE = "category_change"


class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    username: str
    role: str
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    details: Optional[str] = None
    # For token tracking on chat actions
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    success: bool = True


class TokenUsageRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    username: str
    role: str
    operation: str  # "chat" or "embedding"
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    session_id: Optional[str] = None
    # Date partitions for easy querying
    date_str: str = ""        # YYYY-MM-DD
    week_str: str = ""        # YYYY-WNN
    month_str: str = ""       # YYYY-MM


class TokenUsageSummary(BaseModel):
    username: str
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    query_count: int
    period: str  # "daily", "weekly", "monthly", "all-time"


class AuditQueryParams(BaseModel):
    username: Optional[str] = None
    action: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 20
