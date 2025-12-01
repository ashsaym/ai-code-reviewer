"""
Database management API endpoints.

Reset and drop operations for PostgreSQL, Milvus, and Redis.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db, Base, engine
from app.db.models import DatabaseConfig
from app.config import settings
from app.schemas.settings import DatabaseConfigUpdate, DatabaseConfigResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/config", response_model=DatabaseConfigResponse)
async def get_database_config(db: AsyncSession = Depends(get_db)):
    """Get database configuration (creates default if none exists)."""
    result = await db.execute(select(DatabaseConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        config = DatabaseConfig(
            postgres_host=settings.POSTGRES_HOST,
            postgres_port=settings.POSTGRES_PORT,
            postgres_db=settings.POSTGRES_DB,
            redis_host=settings.REDIS_HOST,
            redis_port=settings.REDIS_PORT,
            milvus_host=settings.MILVUS_HOST,
            milvus_port=settings.MILVUS_PORT
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    
    return DatabaseConfigResponse(
        id=config.id,
        postgres_host=config.postgres_host,
        postgres_port=config.postgres_port,
        postgres_db=config.postgres_db,
        redis_host=config.redis_host,
        redis_port=config.redis_port,
        milvus_host=config.milvus_host,
        milvus_port=config.milvus_port,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/config", response_model=DatabaseConfigResponse)
async def update_database_config(
    config_update: DatabaseConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update database configuration."""
    result = await db.execute(select(DatabaseConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        config = DatabaseConfig(
            postgres_host=settings.POSTGRES_HOST,
            postgres_port=settings.POSTGRES_PORT,
            postgres_db=settings.POSTGRES_DB,
            redis_host=settings.REDIS_HOST,
            redis_port=settings.REDIS_PORT,
            milvus_host=settings.MILVUS_HOST,
            milvus_port=settings.MILVUS_PORT
        )
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    return DatabaseConfigResponse(
        id=config.id,
        postgres_host=config.postgres_host,
        postgres_port=config.postgres_port,
        postgres_db=config.postgres_db,
        redis_host=config.redis_host,
        redis_port=config.redis_port,
        milvus_host=config.milvus_host,
        milvus_port=config.milvus_port,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/reset/redis")
async def reset_redis():
    """
    Reset Redis database - clear all cached data.
    This clears all Redis keys but keeps the database.
    """
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        
        keys_count = await r.dbsize()
        await r.flushdb()
        await r.close()
        
        logger.info(f"✅ Redis reset: cleared {keys_count} keys")
        
        return {
            "success": True,
            "message": f"Redis database reset. Cleared {keys_count} keys.",
            "database": "redis"
        }
    except Exception as e:
        logger.error(f"❌ Redis reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Redis reset failed: {str(e)}")


@router.post("/reset/milvus")
async def reset_milvus():
    """
    Reset Milvus database - drop all collections.
    WARNING: This deletes all vector data permanently!
    """
    try:
        from pymilvus import connections, utility
        
        connections.connect(
            alias="reset",
            host=settings.MILVUS_HOST,
            port=str(settings.MILVUS_PORT)
        )
        
        # Get all collections
        collections = utility.list_collections(using="reset")
        dropped_count = 0
        
        for collection_name in collections:
            utility.drop_collection(collection_name, using="reset")
            dropped_count += 1
            logger.info(f"   Dropped collection: {collection_name}")
        
        connections.disconnect("reset")
        
        logger.info(f"✅ Milvus reset: dropped {dropped_count} collections")
        
        return {
            "success": True,
            "message": f"Milvus reset. Dropped {dropped_count} collections.",
            "database": "milvus",
            "collections_dropped": dropped_count
        }
    except Exception as e:
        logger.error(f"❌ Milvus reset failed: {e}")
        try:
            connections.disconnect("reset")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Milvus reset failed: {str(e)}")


@router.post("/reset/postgres")
async def reset_postgres(db: AsyncSession = Depends(get_db)):
    """
    Reset PostgreSQL database - truncate all tables (keep schema).
    WARNING: This deletes all data but keeps the table structure!
    """
    try:
        # Get all table names
        tables_query = text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename != 'alembic_version'
        """)
        result = await db.execute(tables_query)
        tables = [row[0] for row in result.fetchall()]
        
        # Truncate all tables with CASCADE
        for table in tables:
            await db.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
        
        await db.commit()
        
        logger.info(f"✅ PostgreSQL reset: truncated {len(tables)} tables")
        
        return {
            "success": True,
            "message": f"PostgreSQL reset. Truncated {len(tables)} tables.",
            "database": "postgres",
            "tables_truncated": tables
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ PostgreSQL reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"PostgreSQL reset failed: {str(e)}")


@router.post("/reset/all")
async def reset_all_databases(db: AsyncSession = Depends(get_db)):
    """
    Reset ALL databases - Redis, Milvus, and PostgreSQL.
    WARNING: This deletes all data from all databases!
    """
    results = {
        "success": True,
        "databases": {}
    }
    errors = []
    
    # Reset Redis
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        keys_count = await r.dbsize()
        await r.flushdb()
        await r.close()
        results["databases"]["redis"] = {
            "success": True,
            "keys_cleared": keys_count
        }
    except Exception as e:
        errors.append(f"Redis: {str(e)}")
        results["databases"]["redis"] = {"success": False, "error": str(e)}
    
    # Reset Milvus
    try:
        from pymilvus import connections, utility
        connections.connect(
            alias="reset_all",
            host=settings.MILVUS_HOST,
            port=str(settings.MILVUS_PORT)
        )
        collections = utility.list_collections(using="reset_all")
        for collection_name in collections:
            utility.drop_collection(collection_name, using="reset_all")
        connections.disconnect("reset_all")
        results["databases"]["milvus"] = {
            "success": True,
            "collections_dropped": len(collections)
        }
    except Exception as e:
        errors.append(f"Milvus: {str(e)}")
        results["databases"]["milvus"] = {"success": False, "error": str(e)}
        try:
            connections.disconnect("reset_all")
        except Exception:
            pass
    
    # Reset PostgreSQL
    try:
        tables_query = text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename != 'alembic_version'
        """)
        result = await db.execute(tables_query)
        tables = [row[0] for row in result.fetchall()]
        for table in tables:
            await db.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
        await db.commit()
        results["databases"]["postgres"] = {
            "success": True,
            "tables_truncated": len(tables)
        }
    except Exception as e:
        await db.rollback()
        errors.append(f"PostgreSQL: {str(e)}")
        results["databases"]["postgres"] = {"success": False, "error": str(e)}
    
    if errors:
        results["success"] = False
        results["errors"] = errors
    
    logger.info(f"🔄 All databases reset: {results}")
    
    return results


@router.post("/drop/redis")
async def drop_redis():
    """
    Drop Redis database completely - flush all data.
    WARNING: This completely clears Redis!
    """
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.flushall()  # Flush all databases
        await r.close()
        
        logger.info("✅ Redis dropped: all data cleared")
        
        return {
            "success": True,
            "message": "Redis database dropped completely.",
            "database": "redis"
        }
    except Exception as e:
        logger.error(f"❌ Redis drop failed: {e}")
        raise HTTPException(status_code=500, detail=f"Redis drop failed: {str(e)}")


@router.post("/drop/milvus")
async def drop_milvus():
    """
    Drop Milvus database completely - drop all collections.
    WARNING: This permanently deletes all vector data!
    """
    return await reset_milvus()  # Same as reset for Milvus


@router.post("/drop/postgres")
async def drop_postgres(db: AsyncSession = Depends(get_db)):
    """
    Drop PostgreSQL tables completely - drop and recreate all tables.
    WARNING: This permanently deletes all data and recreates the schema!
    """
    try:
        # Drop all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ PostgreSQL dropped and recreated")
        
        return {
            "success": True,
            "message": "PostgreSQL tables dropped and recreated.",
            "database": "postgres"
        }
    except Exception as e:
        logger.error(f"❌ PostgreSQL drop failed: {e}")
        raise HTTPException(status_code=500, detail=f"PostgreSQL drop failed: {str(e)}")


@router.post("/drop/all")
async def drop_all_databases(db: AsyncSession = Depends(get_db)):
    """
    Drop ALL databases completely.
    WARNING: This permanently deletes ALL data from ALL databases!
    """
    results = {
        "success": True,
        "databases": {}
    }
    errors = []
    
    # Drop Redis
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.flushall()
        await r.close()
        results["databases"]["redis"] = {"success": True}
    except Exception as e:
        errors.append(f"Redis: {str(e)}")
        results["databases"]["redis"] = {"success": False, "error": str(e)}
    
    # Drop Milvus
    try:
        from pymilvus import connections, utility
        connections.connect(
            alias="drop_all",
            host=settings.MILVUS_HOST,
            port=str(settings.MILVUS_PORT)
        )
        collections = utility.list_collections(using="drop_all")
        for collection_name in collections:
            utility.drop_collection(collection_name, using="drop_all")
        connections.disconnect("drop_all")
        results["databases"]["milvus"] = {
            "success": True,
            "collections_dropped": len(collections)
        }
    except Exception as e:
        errors.append(f"Milvus: {str(e)}")
        results["databases"]["milvus"] = {"success": False, "error": str(e)}
        try:
            connections.disconnect("drop_all")
        except Exception:
            pass
    
    # Drop PostgreSQL
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        results["databases"]["postgres"] = {"success": True}
    except Exception as e:
        errors.append(f"PostgreSQL: {str(e)}")
        results["databases"]["postgres"] = {"success": False, "error": str(e)}
    
    if errors:
        results["success"] = False
        results["errors"] = errors
    
    logger.info(f"💥 All databases dropped: {results}")
    
    return results
