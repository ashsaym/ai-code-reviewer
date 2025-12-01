"""
Cache settings API endpoints.

Configuration and management of Redis cache.
Settings are stored in DB, with .env values as defaults.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import CacheConfig
from app.config import settings
from app.schemas.settings import (
    CacheConfigUpdate, CacheConfigResponse, CacheStats, CacheClearResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_default_cache_config() -> dict:
    """Get default cache config from .env settings."""
    return {
        "enabled": settings.CACHE_ENABLED,
        "ttl_seconds": settings.CACHE_TTL_SECONDS,
        "embedding_ttl_seconds": settings.CACHE_EMBEDDING_TTL_SECONDS,
        "max_cache_size_mb": 1024,
    }


async def get_redis_client():
    """Get Redis client."""
    import redis.asyncio as redis
    return redis.from_url(settings.redis_url)


@router.get("/stats", response_model=CacheStats)
async def get_cache_stats():
    """Get cache statistics."""
    try:
        r = await get_redis_client()
        
        # Check connection
        await r.ping()
        
        # Get info
        info = await r.info("memory")
        
        # Count keys
        keys_count = await r.dbsize()
        
        # Count embedding keys
        embedding_keys = 0
        async for key in r.scan_iter("embed:*"):
            embedding_keys += 1
        
        await r.close()
        
        return CacheStats(
            connected=True,
            keys_count=keys_count,
            used_memory=info.get("used_memory_human", "0B"),
            embedding_keys=embedding_keys
        )
    except Exception as e:
        logger.warning(f"Cache stats failed: {e}")
        return CacheStats(
            connected=False,
            keys_count=0,
            used_memory="0B",
            embedding_keys=0
        )


@router.post("/clear/embeddings", response_model=CacheClearResponse)
async def clear_embedding_cache():
    """Clear all cached embeddings."""
    try:
        r = await get_redis_client()
        
        # Delete embedding keys
        deleted = 0
        async for key in r.scan_iter("embed:*"):
            await r.delete(key)
            deleted += 1
        
        await r.close()
        
        logger.info(f"Cleared {deleted} embedding cache keys")
        return CacheClearResponse(
            success=True,
            keys_deleted=deleted,
            message=f"Cleared {deleted} cached embeddings"
        )
    except Exception as e:
        logger.error(f"Failed to clear embedding cache: {e}")
        return CacheClearResponse(
            success=False,
            keys_deleted=0,
            message=f"Failed to clear cache: {str(e)}"
        )


@router.post("/clear/all", response_model=CacheClearResponse)
async def clear_all_cache():
    """Clear all cache (embeddings and general)."""
    try:
        r = await get_redis_client()
        
        # Get count before flush
        keys_count = await r.dbsize()
        
        # Flush database
        await r.flushdb()
        
        await r.close()
        
        logger.info(f"Cleared {keys_count} cache keys")
        return CacheClearResponse(
            success=True,
            keys_deleted=keys_count,
            message=f"Cleared {keys_count} cache keys"
        )
    except Exception as e:
        logger.error(f"Failed to clear all cache: {e}")
        return CacheClearResponse(
            success=False,
            keys_deleted=0,
            message=f"Failed to clear cache: {str(e)}"
        )


@router.get("/config", response_model=CacheConfigResponse)
async def get_cache_config(db: AsyncSession = Depends(get_db)):
    """Get cache configuration (creates from .env defaults if none exists)."""
    result = await db.execute(select(CacheConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config from .env settings
        defaults = get_default_cache_config()
        config = CacheConfig(**defaults)
        db.add(config)
        await db.commit()
        await db.refresh(config)
        logger.info("Created default cache config from .env settings")
    
    return CacheConfigResponse(
        id=config.id,
        enabled=config.enabled,
        ttl_seconds=config.ttl_seconds,
        embedding_ttl_seconds=config.embedding_ttl_seconds,
        max_cache_size_mb=config.max_cache_size_mb,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/config", response_model=CacheConfigResponse)
async def update_cache_config(
    config_update: CacheConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update cache configuration."""
    result = await db.execute(select(CacheConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        defaults = get_default_cache_config()
        config = CacheConfig(**defaults)
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Updated cache config: {update_data}")
    
    return CacheConfigResponse(
        id=config.id,
        enabled=config.enabled,
        ttl_seconds=config.ttl_seconds,
        embedding_ttl_seconds=config.embedding_ttl_seconds,
        max_cache_size_mb=config.max_cache_size_mb,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/config/reset", response_model=CacheConfigResponse)
async def reset_cache_config(db: AsyncSession = Depends(get_db)):
    """Reset cache configuration to .env defaults."""
    result = await db.execute(select(CacheConfig).limit(1))
    config = result.scalar_one_or_none()
    
    defaults = get_default_cache_config()
    
    if config:
        # Update existing config with defaults
        for key, value in defaults.items():
            setattr(config, key, value)
    else:
        # Create new config with defaults
        config = CacheConfig(**defaults)
        db.add(config)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info("Reset cache config to .env defaults")
    
    return CacheConfigResponse(
        id=config.id,
        enabled=config.enabled,
        ttl_seconds=config.ttl_seconds,
        embedding_ttl_seconds=config.embedding_ttl_seconds,
        max_cache_size_mb=config.max_cache_size_mb,
        created_at=config.created_at,
        updated_at=config.updated_at
    )
