"""
utils/chunking.py — Semantic document chunking with metadata attachment.

Splits extracted text into overlapping chunks of ~MAX_CHUNK_TOKENS tokens
and attaches document-level metadata to each chunk.
"""
from typing import List
import tiktoken

from config import get_settings
from models.document import DocumentChunk, DocumentCategory

settings = get_settings()

# Use cl100k_base encoding (compatible with GPT-4, text-embedding-3-small)
_encoding = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_encoding.encode(text))


def chunk_text(
    text: str,
    document_id: str,
    document_name: str,
    category: DocumentCategory,
    uploader: str,
    allowed_roles: List[str],
    page_number: int = 1,
) -> List[DocumentChunk]:
    """
    Split text into overlapping token-based chunks.
    Each chunk gets full metadata for RAG retrieval context.
    """
    max_tokens = settings.max_chunk_tokens
    overlap = settings.chunk_overlap_tokens

    tokens = _encoding.encode(text)
    chunks: List[DocumentChunk] = []

    if not tokens:
        return chunks

    start = 0
    chunk_index = 0

    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text_content = _encoding.decode(chunk_tokens)

        # Try to detect section heading (simple heuristic: short first line)
        lines = chunk_text_content.strip().splitlines()
        section = None
        if lines and len(lines[0]) < 80 and lines[0].strip():
            section = lines[0].strip()

        chunk = DocumentChunk(
            document_id=document_id,
            document_name=document_name,
            content=chunk_text_content,
            page_number=page_number,
            section=section,
            category=category,
            uploader=uploader,
            allowed_roles=allowed_roles,
        )
        chunks.append(chunk)

        # Advance with overlap so we don't lose context at chunk boundaries
        start += max_tokens - overlap
        chunk_index += 1

    return chunks


def chunk_pages(
    pages: List[dict],  # [{"page_number": 1, "content": "..."}]
    document_id: str,
    document_name: str,
    category: DocumentCategory,
    uploader: str,
    allowed_roles: List[str],
) -> List[DocumentChunk]:
    """
    Chunk page-by-page content (preferred — preserves page metadata).
    Falls back to chunking within a page if the page is very large.
    """
    all_chunks: List[DocumentChunk] = []

    for page in pages:
        page_number = page.get("page_number", 1)
        content = page.get("content", "").strip()

        if not content:
            continue

        page_chunks = chunk_text(
            text=content,
            document_id=document_id,
            document_name=document_name,
            category=category,
            uploader=uploader,
            allowed_roles=allowed_roles,
            page_number=page_number,
        )
        all_chunks.extend(page_chunks)

    return all_chunks
