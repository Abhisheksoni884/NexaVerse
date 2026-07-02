"""
main.py — FastAPI application entry point.

Registers all routers, configures CORS, and initialises Azure services on startup.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import auth, documents, chat, admin, usage
from services.search_service import ensure_index_exists
from services.cosmos_service import ensure_cosmos_containers
from utils.logging import logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs startup tasks before the app is ready, and cleanup on shutdown.
    """
    logger.info("Starting NexaVerse Application...")

    # Ensure Azure AI Search index exists
    try:
        ensure_index_exists()
        logger.info("Azure AI Search index verified.")
    except Exception as e:
        logger.error(f"Warning: Could not verify Azure AI Search index: {e}")

    # Ensure Cosmos DB containers exist
    try:
        ensure_cosmos_containers()
        logger.info("Cosmos DB containers verified.")
    except Exception as e:
        logger.error(f"Warning: Could not verify Cosmos DB containers: {e}")

    logger.info("Application startup complete. Ready to serve requests.")
    yield

    # Shutdown
    logger.info("Application shutting down.")


app = FastAPI(
    title="NexaVerse — Enterprise Knowledge Assistant API",
    description=(
        "A production-ready RAG backend powered by Azure AI Services. "
        "Supports document upload, intelligent Q&A with citations, RBAC, "
        "audit logging, and token usage tracking."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(usage.router)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "NexaVerse Enterprise Knowledge Assistant API",
        "docs": "/docs",
        "health": "/health",
    }
