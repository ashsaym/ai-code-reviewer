"""
FastAPI main application for InfraMind-AI backend.

A modern, LlamaIndex-based API for AI code assistance with:
- Project-based RAG with chat history
- GitHub source management
- Async background job processing (pause, resume, cancel, restart)
- Configurable caching (disabled by default)
- Comprehensive settings management
"""
import asyncio
import logging
import signal
import time
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.db.session import init_db, close_db

# Configure logging - Reset on each start, log warnings and errors comprehensively
log_file = Path(__file__).parent.parent / "backend.log"
if log_file.exists():
    log_file.unlink()

# File handler - logs WARNING and above with full details
file_handler = logging.FileHandler(log_file, mode='w', encoding='utf-8')
file_handler.setLevel(logging.WARNING)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(funcName)s - %(message)s"
))

# Console handler - logs INFO and above
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
))

# Root logger configuration
logging.basicConfig(
    level=logging.DEBUG,  # Capture all levels, handlers filter what to output
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger(__name__)

# Suppress verbose logging from libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("pymilvus").setLevel(logging.WARNING)
logging.getLogger("llama_index").setLevel(logging.WARNING)

# Startup time for uptime tracking
_startup_time: float = 0


async def check_postgres() -> bool:
    """Check PostgreSQL connection."""
    try:
        from sqlalchemy import text
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"PostgreSQL check failed: {e}")
        return False


async def check_redis() -> bool:
    """Check Redis connection."""
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
        return True
    except Exception as e:
        logger.warning(f"Redis check failed: {e}")
        return False


async def check_milvus() -> bool:
    """Check Milvus connection."""
    try:
        from pymilvus import connections, utility
        connections.connect(
            alias="health_check",
            host=settings.MILVUS_HOST,
            port=str(settings.MILVUS_PORT),
            timeout=5
        )
        version = utility.get_server_version(using="health_check")
        connections.disconnect("health_check")
        return version is not None
    except Exception as e:
        logger.warning(f"Milvus check failed: {e}")
        try:
            from pymilvus import connections
            connections.disconnect("health_check")
        except Exception:
            pass
        return False


# Global shutdown event
shutdown_event = asyncio.Event()


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info(f"🛑 Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    global _startup_time
    _startup_time = datetime.now(timezone.utc).timestamp()
    
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📊 Database: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    logger.info(f"💾 Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
    logger.info(f"🔢 Milvus: {settings.MILVUS_HOST}:{settings.MILVUS_PORT}")
    logger.info(f"💾 Caching: {'Enabled' if settings.CACHE_ENABLED else 'Disabled'}")
    logger.info(f"🔐 Environment: {'Development' if settings.DEBUG else 'Production'}")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Initialize database
    await init_db()
    
    # Check database connections (health check only)
    postgres_ok = await check_postgres()
    redis_ok = await check_redis()
    milvus_ok = await check_milvus()
    
    if postgres_ok:
        logger.info("✅ PostgreSQL connection successful")
    else:
        logger.error("❌ PostgreSQL connection failed")
    
    if redis_ok:
        logger.info("✅ Redis connection successful")
    else:
        logger.warning("⚠️ Redis connection failed - caching unavailable")
    
    if milvus_ok:
        logger.info("✅ Milvus connection successful")
    else:
        logger.error("❌ Milvus connection failed")
    
    if not postgres_ok or not milvus_ok:
        logger.error("🚨 Critical database connections failed!")
    
    logger.info("✅ Application startup complete")
    
    yield
    
    # Graceful shutdown
    logger.info(f"👋 Shutting down {settings.APP_NAME}...")
    
    # Give pending operations time to complete
    logger.info("⏳ Waiting for pending operations (max 5s)...")
    await asyncio.sleep(2)
    
    # Close database connections
    await close_db()
    
    logger.info("✅ Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    description="""
# InfraMind-AI Backend API v4.0

LlamaIndex-based AI code assistant with project RAG.

## Features

- **Projects & Sources**: Manage projects with GitHub repositories
- **Background Jobs**: Async processing with pause/resume/cancel/restart
- **Project Chat**: Chat with codebase context and history
- **Settings**: Comprehensive configuration management
- **Database Management**: Reset and drop operations

## Configuration

- Caching: **Disabled by default** (enable via CACHE_ENABLED=true)
- All settings configurable via API
    """,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with user-friendly messages."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Invalid input data",
            "error_code": "VALIDATION_ERROR",
            "details": exc.errors(),
            "resolution": "Please check your input and ensure all required fields are provided."
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unhandled exception on {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "An unexpected error occurred",
            "error_code": "INTERNAL_ERROR",
            "resolution": "Please try again. If the problem persists, contact support."
        }
    )


# Import and include routers
from app.api.v1.endpoints import health
from app.api.v1.endpoints import openwebui_settings
from app.api.v1.endpoints import github_settings
from app.api.v1.endpoints import cache_settings
from app.api.v1.endpoints import processing_settings
from app.api.v1.endpoints import embedding_settings
from app.api.v1.endpoints import database_settings
from app.api.v1.endpoints import projects
from app.api.v1.endpoints import sources
from app.api.v1.endpoints import jobs
from app.api.v1.endpoints import chat

# Health
app.include_router(health.router, prefix="/api/v1", tags=["Health"])

# Settings
app.include_router(openwebui_settings.router, prefix="/api/v1/settings/openwebui", tags=["Settings - OpenWebUI"])
app.include_router(github_settings.router, prefix="/api/v1/settings/github", tags=["Settings - GitHub"])
app.include_router(cache_settings.router, prefix="/api/v1/settings/cache", tags=["Settings - Cache"])
app.include_router(processing_settings.router, prefix="/api/v1/settings/processing", tags=["Settings - Processing"])
app.include_router(embedding_settings.router, prefix="/api/v1/settings/embedding", tags=["Settings - Embedding"])
app.include_router(database_settings.router, prefix="/api/v1/settings/database", tags=["Settings - Database"])

# Projects and Sources
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(sources.router, prefix="/api/v1/projects", tags=["Sources"])

# Jobs
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])

# Chat & AI
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat & AI"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        },
        "endpoints": {
            "health": "/api/v1/health",
            "projects": "/api/v1/projects",
            "jobs": "/api/v1/jobs",
            "chat": "/api/v1/chat",
            "settings": "/api/v1/settings"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
