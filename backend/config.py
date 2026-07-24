"""
config.py — Centralised application settings loaded from environment variables.
All Azure credentials and app-level config live here.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # ── JWT Auth ───────────────────────────────────────────────────────────────
    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(480, alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")

    # ── Azure OpenAI ─────────────────────────────────────────────────────────────
    azure_openai_endpoint: str = Field(..., alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(..., alias="AZURE_OPENAI_API_KEY")
    azure_openai_api_version: str = Field("2024-12-01-preview", alias="AZURE_OPENAI_API_VERSION")
    azure_openai_chat_deployment: str = Field("gpt-5-mini", alias="AZURE_OPENAI_CHAT_DEPLOYMENT")
    azure_openai_embedding_deployment: str = Field("text-embedding-3-small", alias="AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

    # ── Azure AI Search ────────────────────────────────────────────────────────
    azure_search_endpoint: str = Field(..., alias="AZURE_SEARCH_ENDPOINT")
    azure_search_api_key: str = Field(..., alias="AZURE_SEARCH_API_KEY")
    azure_search_index_name: str = Field("knowledge-index", alias="AZURE_SEARCH_INDEX_NAME")

    # ── Azure Blob Storage ─────────────────────────────────────────────────
    azure_storage_connection_string: str = Field(..., alias="AZURE_STORAGE_CONNECTION_STRING")
    azure_storage_container_name: str = Field("documents", alias="AZURE_STORAGE_CONTAINER_NAME")

    # ── Azure Document Intelligence ────────────────────────────────────────
    azure_document_intelligence_endpoint: str = Field(..., alias="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    azure_document_intelligence_key: str = Field(..., alias="AZURE_DOCUMENT_INTELLIGENCE_KEY")

    # ── Azure Cosmos DB ────────────────────────────────────────────────────
    azure_cosmos_url: str = Field(..., alias="AZURE_COSMOS_URL")
    azure_cosmos_key: str = Field(..., alias="AZURE_COSMOS_KEY")
    azure_cosmos_database: str = Field("rag-database", alias="AZURE_COSMOS_DATABASE")
    azure_cosmos_audit_container: str = Field("audit-logs", alias="AZURE_COSMOS_AUDIT_CONTAINER")
    azure_cosmos_tokens_container: str = Field("token-usage", alias="AZURE_COSMOS_TOKENS_CONTAINER")
    azure_cosmos_documents_container: str = Field("documents-meta", alias="AZURE_COSMOS_DOCUMENTS_CONTAINER")

    # ── Azure Content Safety ───────────────────────────────────────────────
    azure_content_safety_endpoint: str = Field(..., alias="AZURE_CONTENT_SAFETY_ENDPOINT")
    azure_content_safety_key: str = Field(..., alias="AZURE_CONTENT_SAFETY_KEY")

    # ── OAuth 2.0 (Google & GitHub) ───────────────────────────────────────────
    google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field("http://localhost:8000/auth/google/callback", alias="GOOGLE_REDIRECT_URI")
    github_client_id: str = Field(default="", alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(default="", alias="GITHUB_CLIENT_SECRET")
    github_redirect_uri: str = Field("http://localhost:8000/auth/github/callback", alias="GITHUB_REDIRECT_URI")
    oauth_token_expiry_minutes: int = Field(480, alias="OAUTH_TOKEN_EXPIRY_MINUTES")

    # ── App Settings ───────────────────────────────────────────────────────
    app_env: str = Field("development", alias="APP_ENV")
    cors_origins: str = Field("http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")
    max_file_size_mb: int = Field(50, alias="MAX_FILE_SIZE_MB")
    top_k_search_results: int = Field(5, alias="TOP_K_SEARCH_RESULTS")
    max_chunk_tokens: int = Field(500, alias="MAX_CHUNK_TOKENS")
    chunk_overlap_tokens: int = Field(50, alias="CHUNK_OVERLAP_TOKENS")
    llm_max_completion_tokens: int = Field(2048, alias="LLM_MAX_COMPLETION_TOKENS")
    llm_request_timeout_seconds: int = Field(30, alias="LLM_REQUEST_TIMEOUT_SECONDS")
    rag_chunk_preview_chars: int = Field(500, alias="RAG_CHUNK_PREVIEW_CHARS")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "populate_by_name": True}


@lru_cache()
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
