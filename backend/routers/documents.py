"""
routers/documents.py — Document upload, listing, deletion, and category management.

Full processing pipeline:
  Upload → Blob Storage → Document Intelligence → Chunking → Embed → Search Index

Endpoints:
  POST   /documents/upload
  GET    /documents/
  DELETE /documents/{document_id}
  PATCH  /documents/{document_id}/category
  GET    /documents/{document_id}/status
"""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status, BackgroundTasks

from core.auth import get_current_user
from core.rbac import require_admin, get_allowed_roles_for_search
from models.user import User, UserRole
from models.document import (
    DocumentMetadata,
    DocumentStatus,
    DocumentCategory,
    DocumentUploadResponse,
    DocumentListItem,
    UpdateCategoryRequest,
)
from models.audit import AuditLog, AuditAction, TokenUsageRecord
from services.blob_service import upload_file_to_blob, delete_blob, get_blob_name_from_url
from services.document_intel import extract_text_from_file
from services.search_service import index_document_chunks, delete_document_chunks
from services.openai_service import generate_embeddings_batch
from services.cosmos_service import (
    write_audit_log, 
    write_token_usage,
    save_document_metadata,
    get_document_metadata,
    get_all_documents_metadata,
    delete_document_metadata
)
from utils.chunking import chunk_pages
from utils.logging import logger

router = APIRouter(prefix="/documents", tags=["Documents"])

# Supported MIME types
ALLOWED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/tiff": "tiff",
}


async def _process_document(doc_id: str, file_content: bytes, content_type: str, settings_ref):
    """
    Background task: Extract → Chunk → Embed → Index
    Updates document status at each step.
    """
    doc = await get_document_metadata(doc_id)
    if not doc:
        return

    async def update_status(status: DocumentStatus, error: Optional[str] = None):
        doc.status = status
        doc.updated_at = datetime.utcnow()
        if error:
            doc.error_message = error
        await save_document_metadata(doc)

    try:
        # Step 1: Extract text with Document Intelligence
        await update_status(DocumentStatus.extracting)
        logger.info(f"[{doc_id}] Extracting text...")
        extracted = await extract_text_from_file(file_content, content_type)
        doc.page_count = extracted["page_count"]
        await save_document_metadata(doc)

        # Step 2: Chunk the extracted pages
        await update_status(DocumentStatus.chunking)
        logger.info(f"[{doc_id}] Chunking {len(extracted['pages'])} pages...")
        chunks = chunk_pages(
            pages=extracted["pages"],
            document_id=doc_id,
            document_name=doc.original_filename,
            category=doc.category,
            uploader=doc.uploader,
            allowed_roles=doc.allowed_roles,
        )
        doc.chunk_count = len(chunks)
        await save_document_metadata(doc)
        logger.info(f"[{doc_id}] Created {len(chunks)} chunks")

        # Step 3: Generate embeddings (batch for efficiency)
        await update_status(DocumentStatus.indexing)
        logger.info(f"[{doc_id}] Generating embeddings...")
        texts = [chunk.content for chunk in chunks]
        embeddings = await generate_embeddings_batch(texts)

        # Track embedding token usage (approximate: 1 token ≈ 4 chars)
        approx_tokens = sum(len(t) // 4 for t in texts)
        await write_token_usage(TokenUsageRecord(
            username=doc.uploader,
            role=doc.uploader_role,
            operation="embedding",
            model=settings_ref.azure_openai_embedding_deployment,
            prompt_tokens=approx_tokens,
            total_tokens=approx_tokens,
        ))

        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding

        # Step 4: Index in Azure AI Search
        indexed = await index_document_chunks(chunks)
        logger.info(f"[{doc_id}] Indexed {indexed} chunks")

        await update_status(DocumentStatus.ready)
        logger.info(f"[{doc_id}] Document processing complete!")

    except Exception as e:
        logger.error(f"[{doc_id}] Processing failed: {e}")
        await update_status(DocumentStatus.failed, error=str(e))


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    category: DocumentCategory = Form(DocumentCategory.general),
    allowed_roles: str = Form("admin,analyst,viewer"),  # comma-separated
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document and start the processing pipeline.
    Returns immediately with document_id; use GET /documents/{id}/status to poll.

    Viewers cannot upload documents.
    """
    # RBAC: viewers cannot upload
    if current_user.role == UserRole.viewer:
        await write_audit_log(AuditLog(
            username=current_user.username,
            role=current_user.role,
            action=AuditAction.RBAC_ACCESS_DENIED,
            resource="document_upload",
            ip_address=request.client.host if request.client else None,
            details="Viewer attempted to upload document",
            success=False,
        ))
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot upload documents.")

    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {list(ALLOWED_CONTENT_TYPES.keys())}",
        )

    file_content = await file.read()

    # Validate file size
    from config import get_settings
    settings = get_settings()
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(file_content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB",
        )

    # Parse allowed roles
    roles_list = [r.strip() for r in allowed_roles.split(",") if r.strip()]
    # Admin can always see everything; ensure consistency
    if current_user.role == UserRole.admin and "admin" not in roles_list:
        roles_list.insert(0, "admin")

    # Upload to Blob Storage
    blob_info = await upload_file_to_blob(
        file_content=file_content,
        filename=file.filename,
        content_type=file.content_type,
    )

    # Create document metadata record
    doc_id = str(uuid.uuid4())
    doc_meta = DocumentMetadata(
        id=doc_id,
        filename=blob_info["blob_name"],
        original_filename=file.filename,
        blob_url=blob_info["blob_url"],
        status=DocumentStatus.uploading,
        category=category,
        uploader=current_user.username,
        uploader_role=current_user.role,
        file_size_bytes=len(file_content),
        content_type=file.content_type,
        allowed_roles=roles_list,
    )
    await save_document_metadata(doc_meta)

    # Audit log
    await write_audit_log(AuditLog(
        username=current_user.username,
        role=current_user.role,
        action=AuditAction.DOCUMENT_UPLOAD,
        resource="document",
        resource_id=doc_id,
        ip_address=request.client.host if request.client else None,
        details=f"Uploaded: {file.filename} ({len(file_content)} bytes)",
        success=True,
    ))

    # Start background processing (non-blocking)
    background_tasks.add_task(_process_document, doc_id, file_content, file.content_type, settings)

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        status=DocumentStatus.uploading,
        message="Document uploaded. Processing started in background.",
    )


@router.get("/", response_model=List[DocumentListItem])
async def list_documents(current_user: User = Depends(get_current_user)):
    """
    List documents the current user is authorized to see.
    Admin sees all. Analyst sees analyst + viewer docs. Viewer sees only viewer docs.
    """
    allowed_roles = get_allowed_roles_for_search(current_user)
    docs = await get_all_documents_metadata()

    result = []
    for doc in docs:
        # RBAC: only show docs where user's role is in allowed_roles
        if any(role in doc.allowed_roles for role in allowed_roles):
            result.append(DocumentListItem(
                id=doc.id,
                filename=doc.original_filename,
                status=doc.status,
                category=doc.category,
                uploader=doc.uploader,
                page_count=doc.page_count,
                chunk_count=doc.chunk_count,
                file_size_bytes=doc.file_size_bytes,
                created_at=doc.created_at,
            ))

    return sorted(result, key=lambda d: d.created_at, reverse=True)


@router.get("/{document_id}/status")
async def get_document_status(document_id: str, current_user: User = Depends(get_current_user)):
    """Poll the processing status of a document."""
    doc = await get_document_metadata(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        "status": doc.status,
        "page_count": doc.page_count,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
        "updated_at": doc.updated_at,
    }


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Delete a document (Admin only). Removes from Blob Storage and Search index."""
    doc = await get_document_metadata(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from Search index
    await delete_document_chunks(document_id)

    # Delete from Blob Storage
    blob_name = get_blob_name_from_url(doc.blob_url)
    await delete_blob(blob_name)

    # Remove from Cosmos DB
    await delete_document_metadata(document_id)

    await write_audit_log(AuditLog(
        username=current_user.username,
        role=current_user.role,
        action=AuditAction.DOCUMENT_DELETE,
        resource="document",
        resource_id=document_id,
        ip_address=request.client.host if request.client else None,
        details=f"Deleted: {doc.original_filename}",
        success=True,
    ))

    logger.info(f"Document {document_id} deleted by {current_user.username}")


@router.patch("/{document_id}/category")
async def update_document_category(
    document_id: str,
    body: UpdateCategoryRequest,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Update document category (Admin only)."""
    doc = await get_document_metadata(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    old_category = doc.category
    doc.category = body.category
    doc.updated_at = datetime.utcnow()
    await save_document_metadata(doc)

    await write_audit_log(AuditLog(
        username=current_user.username,
        role=current_user.role,
        action=AuditAction.CATEGORY_CHANGE,
        resource="document",
        resource_id=document_id,
        details=f"Category changed from {old_category} to {body.category}",
        success=True,
    ))

    return {"document_id": document_id, "new_category": body.category}
