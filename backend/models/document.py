"""
models/document.py — Pydantic models for document upload, processing, and management.
"""
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class DocumentStatus(str, Enum):
    uploading = "uploading"
    extracting = "extracting"
    chunking = "chunking"
    indexing = "indexing"
    ready = "ready"
    failed = "failed"


class DocumentCategory(str, Enum):
    general = "general"
    finance = "finance"
    hr = "hr"
    legal = "legal"
    technical = "technical"
    confidential = "confidential"


class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    document_name: str
    content: str
    page_number: int
    section: Optional[str] = None
    category: DocumentCategory
    uploader: str
    # Roles that can see this chunk (for RBAC filtering in search)
    allowed_roles: List[str] = ["admin", "analyst", "viewer"]
    embedding: Optional[List[float]] = None


class DocumentMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    blob_url: str
    status: DocumentStatus = DocumentStatus.uploading
    category: DocumentCategory = DocumentCategory.general
    uploader: str
    uploader_role: str
    page_count: int = 0
    chunk_count: int = 0
    file_size_bytes: int = 0
    content_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    allowed_roles: List[str] = ["admin", "analyst", "viewer"]
    error_message: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: str


class DocumentListItem(BaseModel):
    id: str
    filename: str
    status: DocumentStatus
    category: DocumentCategory
    uploader: str
    page_count: int
    chunk_count: int
    file_size_bytes: int
    created_at: datetime


class UpdateCategoryRequest(BaseModel):
    category: DocumentCategory
