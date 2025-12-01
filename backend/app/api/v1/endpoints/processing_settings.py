"""
Processing settings API endpoints.

Configuration for document processing, chunking, and batch operations.
Settings are stored in DB, with .env values as defaults.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import ProcessingConfig
from app.config import settings
from app.schemas.settings import ProcessingConfigUpdate, ProcessingConfigResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def get_default_processing_config() -> dict:
    """Get default processing config from .env settings."""
    return {
        "default_batch_size": settings.DEFAULT_BATCH_SIZE,
        "max_concurrent": settings.DEFAULT_MAX_CONCURRENT,
        "max_parallel_files": settings.MAX_PARALLEL_FILES,
        "max_files_per_batch": settings.MAX_FILES_PER_BATCH,
        "max_documents_per_batch": settings.MAX_DOCUMENTS_PER_BATCH,
        "max_chunk_size": settings.MAX_CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "max_document_size_mb": settings.MAX_DOCUMENT_SIZE_MB,
        "parallel_chunks": settings.PARALLEL_CHUNKS,
        "embedding_batch_size": settings.EMBEDDING_BATCH_SIZE,
        "max_concurrent_requests": settings.MAX_CONCURRENT_REQUESTS,
        "requests_per_minute": settings.REQUESTS_PER_MINUTE,
        "tokens_per_minute": settings.TOKENS_PER_MINUTE,
        "max_retries": settings.MAX_RETRIES,
        "retry_delay_seconds": settings.RETRY_DELAY_SECONDS,
    }


def _to_response(config: ProcessingConfig) -> ProcessingConfigResponse:
    """Convert DB model to response."""
    return ProcessingConfigResponse(
        id=config.id,
        default_batch_size=config.default_batch_size,
        max_concurrent=config.max_concurrent,
        max_parallel_files=config.max_parallel_files,
        max_files_per_batch=config.max_files_per_batch,
        max_documents_per_batch=config.max_documents_per_batch,
        max_chunk_size=config.max_chunk_size,
        chunk_overlap=config.chunk_overlap,
        max_document_size_mb=config.max_document_size_mb,
        parallel_chunks=config.parallel_chunks,
        embedding_batch_size=config.embedding_batch_size,
        max_concurrent_requests=config.max_concurrent_requests,
        requests_per_minute=config.requests_per_minute,
        tokens_per_minute=config.tokens_per_minute,
        max_retries=config.max_retries,
        retry_delay_seconds=config.retry_delay_seconds,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.get("/config", response_model=ProcessingConfigResponse)
async def get_processing_config(db: AsyncSession = Depends(get_db)):
    """Get processing configuration (creates from .env defaults if none exists)."""
    result = await db.execute(select(ProcessingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config from .env settings
        defaults = get_default_processing_config()
        config = ProcessingConfig(**defaults)
        db.add(config)
        await db.commit()
        await db.refresh(config)
        logger.info("Created default processing config from .env settings")
    
    return _to_response(config)


@router.put("/config", response_model=ProcessingConfigResponse)
async def update_processing_config(
    config_update: ProcessingConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update processing configuration."""
    result = await db.execute(select(ProcessingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        defaults = get_default_processing_config()
        config = ProcessingConfig(**defaults)
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Updated processing config: {update_data}")
    
    return _to_response(config)


@router.post("/config/reset", response_model=ProcessingConfigResponse)
async def reset_processing_config(db: AsyncSession = Depends(get_db)):
    """Reset processing configuration to .env defaults."""
    result = await db.execute(select(ProcessingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    defaults = get_default_processing_config()
    
    if config:
        for key, value in defaults.items():
            setattr(config, key, value)
    else:
        config = ProcessingConfig(**defaults)
        db.add(config)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info("Reset processing config to .env defaults")
    
    return _to_response(config)
