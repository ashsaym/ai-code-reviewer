"""
GitHub settings API endpoints.

CRUD operations for GitHub configurations (PAT tokens, hosts, etc.).
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import GitHubConfig
from app.schemas.settings import (
    GitHubConfigCreate, GitHubConfigUpdate, GitHubConfigResponse, GitHubConfigList
)

router = APIRouter()


def mask_token(token: str) -> str:
    """Mask PAT token for response."""
    if not token or len(token) < 8:
        return "****"
    return f"***{token[-4:]}"


@router.get("", response_model=GitHubConfigList)
async def list_github_configs(db: AsyncSession = Depends(get_db)):
    """List all GitHub configurations."""
    result = await db.execute(
        select(GitHubConfig).order_by(GitHubConfig.created_at.desc())
    )
    configs = list(result.scalars().all())
    
    response_configs = [
        GitHubConfigResponse(
            id=str(c.id),
            name=c.name,
            host=c.host,
            api_version=c.api_version,
            username=c.username,
            pat_token_masked=mask_token(c.pat_token),
            is_default=c.is_default,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in configs
    ]
    
    return GitHubConfigList(configs=response_configs, total=len(configs))


@router.post("", response_model=GitHubConfigResponse, status_code=201)
async def create_github_config(
    config: GitHubConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new GitHub configuration."""
    # Check for duplicate name
    existing = await db.execute(
        select(GitHubConfig).where(GitHubConfig.name == config.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Config with name '{config.name}' already exists"
        )
    
    db_config = GitHubConfig(**config.model_dump())
    db.add(db_config)
    await db.commit()
    await db.refresh(db_config)
    
    return GitHubConfigResponse(
        id=str(db_config.id),
        name=db_config.name,
        host=db_config.host,
        api_version=db_config.api_version,
        username=db_config.username,
        pat_token_masked=mask_token(db_config.pat_token),
        is_default=db_config.is_default,
        is_active=db_config.is_active,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at
    )


@router.get("/{config_id}", response_model=GitHubConfigResponse)
async def get_github_config(
    config_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a GitHub configuration by ID."""
    try:
        uid = UUID(config_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID")
    
    result = await db.execute(
        select(GitHubConfig).where(GitHubConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return GitHubConfigResponse(
        id=str(config.id),
        name=config.name,
        host=config.host,
        api_version=config.api_version,
        username=config.username,
        pat_token_masked=mask_token(config.pat_token),
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/{config_id}", response_model=GitHubConfigResponse)
async def update_github_config(
    config_id: str,
    config_update: GitHubConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a GitHub configuration."""
    try:
        uid = UUID(config_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID")
    
    result = await db.execute(
        select(GitHubConfig).where(GitHubConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Check for duplicate name if being changed
    if config_update.name and config_update.name != config.name:
        existing = await db.execute(
            select(GitHubConfig).where(GitHubConfig.name == config_update.name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Config with name '{config_update.name}' already exists"
            )
    
    # If setting as default, unset other defaults
    if config_update.is_default:
        await db.execute(
            update(GitHubConfig)
            .where(GitHubConfig.id != uid)
            .values(is_default=False)
        )
    
    # Update fields
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    return GitHubConfigResponse(
        id=str(config.id),
        name=config.name,
        host=config.host,
        api_version=config.api_version,
        username=config.username,
        pat_token_masked=mask_token(config.pat_token),
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.delete("/{config_id}")
async def delete_github_config(
    config_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a GitHub configuration."""
    try:
        uid = UUID(config_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID")
    
    result = await db.execute(
        select(GitHubConfig).where(GitHubConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    await db.delete(config)
    await db.commit()
    
    return {"success": True, "message": "Config deleted"}


@router.post("/{config_id}/set-default", response_model=GitHubConfigResponse)
async def set_default_github_config(
    config_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Set a GitHub configuration as the default."""
    try:
        uid = UUID(config_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID")
    
    # Get all configs
    result = await db.execute(select(GitHubConfig))
    all_configs = list(result.scalars().all())
    
    target_config = None
    for c in all_configs:
        if c.id == uid:
            target_config = c
            c.is_default = True
        else:
            c.is_default = False
    
    if not target_config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    await db.commit()
    await db.refresh(target_config)
    
    return GitHubConfigResponse(
        id=str(target_config.id),
        name=target_config.name,
        host=target_config.host,
        api_version=target_config.api_version,
        username=target_config.username,
        pat_token_masked=mask_token(target_config.pat_token),
        is_default=target_config.is_default,
        is_active=target_config.is_active,
        created_at=target_config.created_at,
        updated_at=target_config.updated_at
    )


@router.post("/{config_id}/test")
async def test_github_config(
    config_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Test a GitHub configuration by making an API call."""
    try:
        uid = UUID(config_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID")
    
    result = await db.execute(
        select(GitHubConfig).where(GitHubConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # Test the connection
    try:
        import httpx
        
        # Determine API URL based on host (configurable per config)
        if config.host == "github.com":
            api_base = "https://api.github.com"
        else:
            # GitHub Enterprise or custom host
            api_base = f"https://{config.host}/api/v3"
        api_url = f"{api_base}/user"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                api_url,
                headers={
                    "Authorization": f"token {config.pat_token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": config.api_version
                }
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "success": True,
                    "message": "Connection successful",
                    "user": {
                        "login": user_data.get("login"),
                        "name": user_data.get("name"),
                        "email": user_data.get("email")
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"GitHub API returned status {response.status_code}",
                    "error": response.text
                }
    except Exception as e:
        return {
            "success": False,
            "message": "Connection failed",
            "error": str(e)
        }
