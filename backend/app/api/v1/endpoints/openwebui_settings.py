"""
OpenWebUI settings API endpoints.

CRUD operations for OpenWebUI configurations.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import OpenWebUIConfig
from app.schemas.settings import (
    OpenWebUIConfigCreate, OpenWebUIConfigUpdate, OpenWebUIConfigResponse,
    OpenWebUIConfigList, AvailableModels
)

router = APIRouter()


def mask_api_key(key: str) -> str:
    """Mask API key for response."""
    if not key or len(key) < 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


@router.get("", response_model=OpenWebUIConfigList)
async def list_openwebui_configs(db: AsyncSession = Depends(get_db)):
    """List all OpenWebUI configurations."""
    result = await db.execute(
        select(OpenWebUIConfig).order_by(OpenWebUIConfig.created_at.desc())
    )
    configs = list(result.scalars().all())
    
    # Mask API keys in response
    response_configs = []
    for c in configs:
        config_dict = {
            "id": c.id,
            "name": c.name,
            "api_url": c.api_url,
            "api_key": mask_api_key(c.api_key),
            "default_chat_model": c.default_chat_model,
            "default_embedding_model": c.default_embedding_model,
            "chat_context_size": c.chat_context_size,
            "embedding_context_size": c.embedding_context_size,
            "embedding_dimension": c.embedding_dimension,
            "default_temperature": c.default_temperature,
            "default_max_tokens": c.default_max_tokens,
            "chat_history_max_messages": c.chat_history_max_messages,
            "is_default": c.is_default,
            "is_active": c.is_active,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        }
        response_configs.append(OpenWebUIConfigResponse(**config_dict))
    
    return OpenWebUIConfigList(configs=response_configs, total=len(configs))


@router.post("", response_model=OpenWebUIConfigResponse, status_code=201)
async def create_openwebui_config(
    config: OpenWebUIConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new OpenWebUI configuration."""
    # Check for duplicate name
    existing = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.name == config.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Config with name '{config.name}' already exists"
        )
    
    # If this is set as default, unset other defaults
    if config.is_default:
        await db.execute(update(OpenWebUIConfig).values(is_default=False))
    
    db_config = OpenWebUIConfig(**config.model_dump())
    db.add(db_config)
    await db.commit()
    await db.refresh(db_config)
    
    return OpenWebUIConfigResponse(
        id=db_config.id,
        name=db_config.name,
        api_url=db_config.api_url,
        api_key=mask_api_key(db_config.api_key),
        default_chat_model=db_config.default_chat_model,
        default_embedding_model=db_config.default_embedding_model,
        chat_context_size=db_config.chat_context_size,
        embedding_context_size=db_config.embedding_context_size,
        embedding_dimension=db_config.embedding_dimension,
        default_temperature=db_config.default_temperature,
        default_max_tokens=db_config.default_max_tokens,
        chat_history_max_messages=db_config.chat_history_max_messages,
        is_default=db_config.is_default,
        is_active=db_config.is_active,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at
    )


@router.get("/{config_id}", response_model=OpenWebUIConfigResponse)
async def get_openwebui_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific OpenWebUI configuration."""
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return OpenWebUIConfigResponse(
        id=config.id,
        name=config.name,
        api_url=config.api_url,
        api_key=mask_api_key(config.api_key),
        default_chat_model=config.default_chat_model,
        default_embedding_model=config.default_embedding_model,
        chat_context_size=config.chat_context_size,
        embedding_context_size=config.embedding_context_size,
        embedding_dimension=config.embedding_dimension,
        default_temperature=config.default_temperature,
        default_max_tokens=config.default_max_tokens,
        chat_history_max_messages=config.chat_history_max_messages,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/{config_id}", response_model=OpenWebUIConfigResponse)
async def update_openwebui_config(
    config_id: UUID,
    config_update: OpenWebUIConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an OpenWebUI configuration."""
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Check for duplicate name if being changed
    if config_update.name and config_update.name != config.name:
        existing = await db.execute(
            select(OpenWebUIConfig).where(OpenWebUIConfig.name == config_update.name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Config with name '{config_update.name}' already exists"
            )
    
    # If setting as default, unset other defaults
    if config_update.is_default:
        await db.execute(
            update(OpenWebUIConfig)
            .where(OpenWebUIConfig.id != config_id)
            .values(is_default=False)
        )
    
    # Update fields
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    return OpenWebUIConfigResponse(
        id=config.id,
        name=config.name,
        api_url=config.api_url,
        api_key=mask_api_key(config.api_key),
        default_chat_model=config.default_chat_model,
        default_embedding_model=config.default_embedding_model,
        chat_context_size=config.chat_context_size,
        embedding_context_size=config.embedding_context_size,
        embedding_dimension=config.embedding_dimension,
        default_temperature=config.default_temperature,
        default_max_tokens=config.default_max_tokens,
        chat_history_max_messages=config.chat_history_max_messages,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.delete("/{config_id}")
async def delete_openwebui_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete an OpenWebUI configuration."""
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    if config.is_default:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the default configuration. Set another config as default first."
        )
    
    # Check if it's the last config
    count_result = await db.execute(select(OpenWebUIConfig))
    configs = list(count_result.scalars().all())
    if len(configs) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last configuration."
        )
    
    await db.delete(config)
    await db.commit()
    
    return {"success": True, "message": "Config deleted"}


@router.post("/{config_id}/set-default", response_model=OpenWebUIConfigResponse)
async def set_default_openwebui_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Set a configuration as the default."""
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Unset all defaults
    await db.execute(update(OpenWebUIConfig).values(is_default=False))
    
    # Set this as default
    config.is_default = True
    await db.commit()
    await db.refresh(config)
    
    return OpenWebUIConfigResponse(
        id=config.id,
        name=config.name,
        api_url=config.api_url,
        api_key=mask_api_key(config.api_key),
        default_chat_model=config.default_chat_model,
        default_embedding_model=config.default_embedding_model,
        chat_context_size=config.chat_context_size,
        embedding_context_size=config.embedding_context_size,
        embedding_dimension=config.embedding_dimension,
        default_temperature=config.default_temperature,
        default_max_tokens=config.default_max_tokens,
        chat_history_max_messages=config.chat_history_max_messages,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/{config_id}/test")
async def test_openwebui_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Test an OpenWebUI configuration and fetch available models."""
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    try:
        import httpx
        
        # Test connection and fetch models
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{config.api_url}/models",
                headers={"Authorization": f"Bearer {config.api_key}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                models = []
                
                if isinstance(data, dict) and "data" in data:
                    models = [m.get("id", m.get("name", "")) for m in data["data"]]
                elif isinstance(data, list):
                    models = [m.get("id", m.get("name", "")) for m in data]
                
                # Separate chat and embedding models
                chat_models = models
                embedding_models = [m for m in models if "embed" in m.lower()]
                
                return {
                    "success": True,
                    "message": f"Successfully connected to OpenWebUI. Found {len(models)} models.",
                    "models": {
                        "chat_models": chat_models,
                        "embedding_models": embedding_models
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to connect: HTTP {response.status_code}"
                }
    
    except httpx.TimeoutException:
        return {
            "success": False,
            "message": "Connection timeout. Please check the API URL."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}"
        }


@router.get("/models/available", response_model=AvailableModels)
async def get_available_models(db: AsyncSession = Depends(get_db)):
    """
    Get list of available models from OpenWebUI API.
    Falls back to configured models if API is unavailable.
    """
    # Get default config
    result = await db.execute(
        select(OpenWebUIConfig).where(OpenWebUIConfig.is_default == True)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        return AvailableModels(models=[], chat_models=[], embedding_models=[])
    
    # Try to fetch models from OpenWebUI API
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{config.api_url}/models",
                headers={"Authorization": f"Bearer {config.api_key}"}
            )
            if response.status_code == 200:
                data = response.json()
                models = []
                if isinstance(data, dict) and "data" in data:
                    models = [m.get("id", m.get("name", "")) for m in data["data"]]
                elif isinstance(data, list):
                    models = [m.get("id", m.get("name", "")) for m in data]
                
                return AvailableModels(
                    models=models,
                    chat_models=models,  # Assume all can be used for chat
                    embedding_models=[m for m in models if "embed" in m.lower()]
                )
    except Exception:
        pass
    
    # Fall back to configured models
    configured = []
    if config.default_chat_model:
        configured.append(config.default_chat_model)
    if config.default_embedding_model:
        configured.append(config.default_embedding_model)
    
    return AvailableModels(
        models=configured,
        chat_models=[config.default_chat_model] if config.default_chat_model else [],
        embedding_models=[config.default_embedding_model] if config.default_embedding_model else []
    )
