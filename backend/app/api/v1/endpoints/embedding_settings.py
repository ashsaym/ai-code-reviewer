"""
Embedding settings API endpoints.

Configuration for embedding model and parameters.
Settings are stored in DB, with .env values as defaults.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import EmbeddingConfig
from app.config import settings
from app.schemas.settings import EmbeddingConfigUpdate, EmbeddingConfigResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def get_default_embedding_config() -> dict:
    """Get default embedding config from .env settings."""
    return {
        "model_name": settings.OPENWEB_EMBEDDER_MODEL,
        "dimension": settings.EMBEDDING_DIMENSION,
        "context_size": settings.OPENWEB_EMBEDDING_CONTEXT_SIZE,
        "batch_size": settings.DEFAULT_BATCH_SIZE,
        "max_concurrent_requests": settings.DEFAULT_MAX_CONCURRENT,
    }


@router.get("/config", response_model=EmbeddingConfigResponse)
async def get_embedding_config(db: AsyncSession = Depends(get_db)):
    """Get embedding configuration (creates from .env defaults if none exists)."""
    result = await db.execute(select(EmbeddingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config from .env settings
        defaults = get_default_embedding_config()
        config = EmbeddingConfig(**defaults)
        db.add(config)
        await db.commit()
        await db.refresh(config)
        logger.info("Created default embedding config from .env settings")
    
    return EmbeddingConfigResponse(
        id=config.id,
        model_name=config.model_name,
        dimension=config.dimension,
        context_size=config.context_size,
        batch_size=config.batch_size,
        max_concurrent_requests=config.max_concurrent_requests,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/config", response_model=EmbeddingConfigResponse)
async def update_embedding_config(
    config_update: EmbeddingConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update embedding configuration."""
    result = await db.execute(select(EmbeddingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        defaults = get_default_embedding_config()
        config = EmbeddingConfig(**defaults)
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Updated embedding config: {update_data}")
    
    return EmbeddingConfigResponse(
        id=config.id,
        model_name=config.model_name,
        dimension=config.dimension,
        context_size=config.context_size,
        batch_size=config.batch_size,
        max_concurrent_requests=config.max_concurrent_requests,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/config/reset", response_model=EmbeddingConfigResponse)
async def reset_embedding_config(db: AsyncSession = Depends(get_db)):
    """Reset embedding configuration to .env defaults."""
    result = await db.execute(select(EmbeddingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    defaults = get_default_embedding_config()
    
    if config:
        for key, value in defaults.items():
            setattr(config, key, value)
    else:
        config = EmbeddingConfig(**defaults)
        db.add(config)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info("Reset embedding config to .env defaults")
    
    return EmbeddingConfigResponse(
        id=config.id,
        model_name=config.model_name,
        dimension=config.dimension,
        context_size=config.context_size,
        batch_size=config.batch_size,
        max_concurrent_requests=config.max_concurrent_requests,
        created_at=config.created_at,
        updated_at=config.updated_at
    )
