"""
Health check API endpoints.

Only checks database connections - NOT external services like OpenWebUI or GitHub.
Those settings are configured after the app is running.
"""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.config import settings
from app.schemas.health import (
    HealthResponse, DatabaseHealth, QuickHealthResponse, DetailedHealthResponse
)

router = APIRouter()

# Track startup time for uptime calculation
_startup_time = time.time()


async def check_postgres(db: AsyncSession) -> bool:
    """Check PostgreSQL connection."""
    try:
        await db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_redis() -> bool:
    """Check Redis connection."""
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
        return True
    except Exception:
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
    except Exception:
        try:
            from pymilvus import connections
            connections.disconnect("health_check")
        except Exception:
            pass
        return False


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check for database connections only.
    
    Checks:
    - PostgreSQL database
    - Redis cache
    - Milvus vector database
    
    Note: Does NOT check OpenWebUI or GitHub - those are configured after startup.
    """
    postgres_ok = await check_postgres(db)
    redis_ok = await check_redis()
    milvus_ok = await check_milvus()
    
    # Critical: postgres and milvus must be connected
    # Redis is optional (caching can be disabled)
    all_critical_healthy = postgres_ok and milvus_ok
    
    if all_critical_healthy and redis_ok:
        status = "healthy"
    elif all_critical_healthy:
        status = "degraded"  # Missing Redis
    else:
        status = "unhealthy"  # Missing critical database
    
    return HealthResponse(
        status=status,
        databases=DatabaseHealth(
            postgres=postgres_ok,
            redis=redis_ok,
            milvus=milvus_ok
        ),
        uptime_seconds=time.time() - _startup_time,
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc)
    )


@router.get("/health/quick", response_model=QuickHealthResponse)
async def quick_health():
    """
    Quick health check for load balancers.
    
    Always returns 200 OK if the app is running.
    Use /health for detailed status.
    """
    return QuickHealthResponse(status="ok")


@router.get("/health/detailed")
async def detailed_health(db: AsyncSession = Depends(get_db)):
    """
    Detailed health check with diagnostics and recommendations.
    
    Includes:
    - Service connectivity details
    - Configuration status
    - Issues and recommendations
    """
    issues = []
    recommendations = []
    
    # Check PostgreSQL
    postgres_ok = await check_postgres(db)
    postgres_error = None
    if not postgres_ok:
        postgres_error = "Connection failed"
        issues.append("PostgreSQL connection failed")
        recommendations.append("Check database credentials and ensure PostgreSQL is running")
    
    # Check Redis
    redis_ok = await check_redis()
    redis_info = {}
    if redis_ok:
        try:
            import redis.asyncio as redis
            r = redis.from_url(settings.redis_url)
            info = await r.info("memory")
            redis_info = {
                "used_memory_human": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients", 0)
            }
            await r.close()
        except Exception:
            pass
    else:
        if settings.CACHE_ENABLED:
            issues.append("Redis connection failed but caching is enabled")
            recommendations.append("Check Redis connection or disable caching via CACHE_ENABLED=false")
        else:
            redis_info["status"] = "disabled_via_config"
    
    # Check Milvus
    milvus_ok = await check_milvus()
    milvus_error = None
    milvus_version = None
    if milvus_ok:
        try:
            from pymilvus import connections, utility
            connections.connect(
                alias="health_detailed",
                host=settings.MILVUS_HOST,
                port=str(settings.MILVUS_PORT),
                timeout=5
            )
            milvus_version = utility.get_server_version(using="health_detailed")
            connections.disconnect("health_detailed")
        except Exception:
            pass
    else:
        milvus_error = "Connection failed"
        issues.append("Milvus connection failed")
        recommendations.append("Ensure Milvus vector database is running. Check MILVUS_HOST and MILVUS_PORT.")
    
    # Configuration checks
    config_status = {
        "cache_enabled": settings.CACHE_ENABLED,
        "debug_mode": settings.DEBUG,
        "openweb_api_key_set": bool(settings.OPENWEB_API_KEY),
        "github_pat_set": bool(settings.REPO_PAT_TOKEN)
    }
    
    if not settings.OPENWEB_API_KEY:
        issues.append("OPENWEB_API_KEY not configured")
        recommendations.append("Set OPENWEB_API_KEY for AI features")
    
    if not settings.REPO_PAT_TOKEN:
        issues.append("REPO_PAT_TOKEN not configured")
        recommendations.append("Set REPO_PAT_TOKEN for GitHub integration")
    
    # Determine overall status
    critical_ok = postgres_ok and milvus_ok
    if not critical_ok:
        status = "unhealthy"
    elif not redis_ok and settings.CACHE_ENABLED:
        status = "degraded"
    elif issues:
        status = "healthy_with_warnings"
    else:
        status = "healthy"
    
    return {
        "status": status,
        "services": {
            "postgres": {
                "status": "healthy" if postgres_ok else "unhealthy",
                "host": settings.POSTGRES_HOST,
                "port": settings.POSTGRES_PORT,
                "error": postgres_error
            },
            "redis": {
                "status": "healthy" if redis_ok else ("disabled" if not settings.CACHE_ENABLED else "unhealthy"),
                "host": settings.REDIS_HOST,
                "port": settings.REDIS_PORT,
                "info": redis_info
            },
            "milvus": {
                "status": "healthy" if milvus_ok else "unhealthy",
                "host": settings.MILVUS_HOST,
                "port": settings.MILVUS_PORT,
                "version": milvus_version,
                "error": milvus_error
            }
        },
        "configuration": config_status,
        "issues": issues,
        "recommendations": recommendations,
        "uptime_seconds": time.time() - _startup_time
    }
