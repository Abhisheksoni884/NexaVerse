"""
main.py — FastAPI application entry point.

Registers all routers, configures CORS, and initialises Azure services on startup.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

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

from starlette.middleware.sessions import SessionMiddleware

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,
    max_age=3600,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(usage.router, prefix="/api")


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.app_env,
    }


# ── Serve Frontend Static Files ───────────────────────────────────────────────
# Mount the React frontend (built to backend/static)
# IMPORTANT: This must be the LAST mount to act as a catch-all for non-API routes
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")
    
    # Serve static files in root (favicon, etc)
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(static_dir / "favicon.svg")
    
    @app.get("/icons.svg")
    async def icons():
        return FileResponse(static_dir / "icons.svg")
    # Catch legacy OAuth callbacks (from misconfigured Google Cloud Console)
    @app.get("/auth/google/callback")
    async def proxy_google_callback(request: Request):
        return RedirectResponse(url=f"/api/auth/google/callback?{request.query_params}")
    
    # Catch-all route for SPA - serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve index.html for all routes that don't match API endpoints"""
        return FileResponse(static_dir / "index.html")
    
    logger.info(f"Serving frontend from {static_dir}")
else:
    logger.warning(f"Static directory not found at {static_dir}. Frontend will not be served.")
