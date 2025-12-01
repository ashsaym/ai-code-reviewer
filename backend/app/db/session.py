"""
Database session management for async SQLAlchemy.
"""
import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Async engine with connection pooling
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.DEBUG,
    poolclass=NullPool,  # Use NullPool for better async behavior
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)


async def init_db() -> None:
    """Initialize database - create all tables."""
    logger.info("🗄️  Initializing database...")
    async with engine.begin() as conn:
        # Import models to register them with Base
        from app.db.models import settings as settings_models
        from app.db.models import projects as project_models
        from app.db.models import jobs as job_models
        from app.db.models import chat as chat_models
        
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database initialized")


async def close_db() -> None:
    """Close database connections."""
    logger.info("🔒 Closing database connections...")
    await engine.dispose()
    logger.info("✅ Database connections closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
