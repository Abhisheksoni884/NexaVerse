"""
services/search_service.py — Azure AI Search index management and hybrid search.

Handles:
  - Index creation with vector field configuration
  - Uploading document chunks (with embeddings)
  - Hybrid search (keyword + vector) with RBAC filtering
  - Chunk deletion when a document is removed
"""
from typing import List, Optional

from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticSearch,
    SemanticPrioritizedFields,
    SemanticField,
)
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential

from config import get_settings
from models.document import DocumentChunk
from utils.logging import logger

settings = get_settings()

EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small dimensions


def _get_index_client() -> SearchIndexClient:
    return SearchIndexClient(
        endpoint=settings.azure_search_endpoint,
        credential=AzureKeyCredential(settings.azure_search_api_key),
    )


def _get_search_client() -> SearchClient:
    return SearchClient(
        endpoint=settings.azure_search_endpoint,
        index_name=settings.azure_search_index_name,
        credential=AzureKeyCredential(settings.azure_search_api_key),
    )


def ensure_index_exists() -> None:
    """
    Create the Azure AI Search index if it doesn't already exist.
    Defines the schema including a vector field for semantic search.
    Call this once at application startup.
    """
    index_client = _get_index_client()

    # Check if index already exists
    existing_indexes = [idx.name for idx in index_client.list_indexes()]
    if settings.azure_search_index_name in existing_indexes:
        logger.info(f"Search index '{settings.azure_search_index_name}' already exists.")
        return

    logger.info(f"Creating search index '{settings.azure_search_index_name}'...")

    fields = [
        SimpleField(name="chunk_id", type=SearchFieldDataType.String, key=True, filterable=True),
        SimpleField(name="document_id", type=SearchFieldDataType.String, filterable=True),
        SearchableField(name="document_name", type=SearchFieldDataType.String, filterable=True),
        SearchableField(name="content", type=SearchFieldDataType.String),
        SimpleField(name="page_number", type=SearchFieldDataType.Int32, filterable=True, sortable=True),
        SearchableField(name="section", type=SearchFieldDataType.String, filterable=True),
        SimpleField(name="category", type=SearchFieldDataType.String, filterable=True),
        SimpleField(name="uploader", type=SearchFieldDataType.String, filterable=True),
        # Collection field for RBAC filtering — stores list of allowed roles
        SimpleField(
            name="allowed_roles",
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            filterable=True,
        ),
        # Vector field for semantic similarity search
        SearchField(
            name="embedding",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=EMBEDDING_DIMENSIONS,
            vector_search_profile_name="rag-hnsw-profile",
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="rag-hnsw")],
        profiles=[VectorSearchProfile(name="rag-hnsw-profile", algorithm_configuration_name="rag-hnsw")],
    )

    semantic_config = SemanticConfiguration(
        name="rag-semantic-config",
        prioritized_fields=SemanticPrioritizedFields(
            content_fields=[SemanticField(field_name="content")],
            keywords_fields=[SemanticField(field_name="document_name")],
        ),
    )

    index = SearchIndex(
        name=settings.azure_search_index_name,
        fields=fields,
        vector_search=vector_search,
        semantic_search=SemanticSearch(configurations=[semantic_config]),
    )

    index_client.create_index(index)
    logger.info(f"Search index '{settings.azure_search_index_name}' created successfully.")


async def index_document_chunks(chunks: List[DocumentChunk]) -> int:
    """
    Upload document chunks to Azure AI Search.
    Returns the number of chunks successfully indexed.
    """
    if not chunks:
        return 0

    search_client = _get_search_client()

    documents = []
    for chunk in chunks:
        doc = {
            "chunk_id": chunk.chunk_id,
            "document_id": chunk.document_id,
            "document_name": chunk.document_name,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "section": chunk.section or "",
            "category": chunk.category.value,
            "uploader": chunk.uploader,
            "allowed_roles": chunk.allowed_roles,
            "embedding": chunk.embedding,
        }
        documents.append(doc)

    # Upload in batches of 100 (Azure Search limit per batch)
    batch_size = 100
    total_indexed = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        result = search_client.upload_documents(documents=batch)
        succeeded = sum(1 for r in result if r.succeeded)
        total_indexed += succeeded
        logger.info(f"Indexed batch {i//batch_size + 1}: {succeeded}/{len(batch)} chunks")

    return total_indexed


async def hybrid_search(
    query: str,
    query_embedding: List[float],
    allowed_roles: List[str],
    top_k: int = 5,
    category_filter: Optional[str] = None,
) -> List[dict]:
    """
    Perform hybrid search (keyword + vector) with RBAC role filtering.

    The RBAC filter ensures users only see documents they are authorized to access.
    Uses Reciprocal Rank Fusion (RRF) to merge keyword and vector results.
    """
    search_client = _get_search_client()

    # Build RBAC filter: chunk's allowed_roles must contain at least one of the user's roles
    role_filters = " or ".join([f"allowed_roles/any(r: r eq '{role}')" for role in allowed_roles])
    filter_expression = f"({role_filters})"

    if category_filter:
        filter_expression += f" and category eq '{category_filter}'"

    vector_query = VectorizedQuery(
        vector=query_embedding,
        k_nearest_neighbors=top_k * 2,  # Over-fetch, then RRF will re-rank
        fields="embedding",
    )

    results = search_client.search(
        search_text=query,
        vector_queries=[vector_query],
        filter=filter_expression,
        select=["chunk_id", "document_id", "document_name", "content", "page_number", "section", "category"],
        top=top_k,
    )

    chunks = []
    for result in results:
        chunks.append({
            "chunk_id": result["chunk_id"],
            "document_id": result["document_id"],
            "document_name": result["document_name"],
            "content": result["content"],
            "page_number": result["page_number"],
            "section": result.get("section", ""),
            "category": result["category"],
            "score": result.get("@search.score", 0),
        })

    logger.info(f"Hybrid search returned {len(chunks)} chunks for query: '{query[:50]}...'")
    return chunks


async def delete_document_chunks(document_id: str) -> int:
    """
    Delete all chunks for a document from the search index.
    Returns the number of chunks deleted.
    """
    search_client = _get_search_client()

    # First, find all chunks for this document
    results = search_client.search(
        search_text="*",
        filter=f"document_id eq '{document_id}'",
        select=["chunk_id"],
        top=1000,
    )

    chunk_ids = [{"chunk_id": r["chunk_id"]} for r in results]

    if not chunk_ids:
        logger.info(f"No chunks found for document_id: {document_id}")
        return 0

    delete_result = search_client.delete_documents(documents=chunk_ids)
    deleted = sum(1 for r in delete_result if r.succeeded)
    logger.info(f"Deleted {deleted} chunks for document_id: {document_id}")
    return deleted
