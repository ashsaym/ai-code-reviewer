"""
Projects API endpoints.

CRUD operations for projects using LlamaIndex for RAG.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Project, Source, SourceFile, DocumentChunk
from app.config import settings
from app.schemas.projects import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_milvus_collection_name(project_id: UUID) -> str:
    """Generate Milvus collection name from project ID."""
    return f"project_{str(project_id).replace('-', '_')}"


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all projects with source statistics."""
    # Get projects with sources
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.sources))
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = list(result.scalars().all())
    
    # Get total count
    count_result = await db.execute(select(func.count(Project.id)))
    total = count_result.scalar() or 0
    
    items = []
    for p in projects:
        source_count = len(p.sources) if p.sources else 0
        total_files = sum(s.total_files for s in p.sources) if p.sources else 0
        total_chunks = sum(s.total_chunks for s in p.sources) if p.sources else 0
        
        items.append(ProjectResponse(
            id=str(p.id),
            name=p.name,
            description=p.description,
            is_active=p.is_active,
            github_config_id=str(p.github_config_id) if p.github_config_id else None,
            openwebui_config_id=str(p.openwebui_config_id) if p.openwebui_config_id else None,
            milvus_collection=p.milvus_collection,
            source_count=source_count,
            total_files=total_files,
            total_chunks=total_chunks,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))
    
    return ProjectListResponse(projects=items, total=total)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    # Check for duplicate name
    existing = await db.execute(
        select(Project).where(Project.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Project with name '{data.name}' already exists"
        )
    
    # Create project
    project = Project(
        name=data.name,
        description=data.description,
        github_config_id=UUID(data.github_config_id) if data.github_config_id else None,
        openwebui_config_id=UUID(data.openwebui_config_id) if data.openwebui_config_id else None
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Set Milvus collection name
    project.milvus_collection = get_milvus_collection_name(project.id)
    await db.commit()
    await db.refresh(project)
    
    logger.info(f"✅ Created project: {project.name} ({project.id})")
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        is_active=project.is_active,
        github_config_id=str(project.github_config_id) if project.github_config_id else None,
        openwebui_config_id=str(project.openwebui_config_id) if project.openwebui_config_id else None,
        milvus_collection=project.milvus_collection,
        source_count=0,
        total_files=0,
        total_chunks=0,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a project by ID."""
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.sources))
        .where(Project.id == uid)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    source_count = len(project.sources) if project.sources else 0
    total_files = sum(s.total_files for s in project.sources) if project.sources else 0
    total_chunks = sum(s.total_chunks for s in project.sources) if project.sources else 0
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        is_active=project.is_active,
        github_config_id=str(project.github_config_id) if project.github_config_id else None,
        openwebui_config_id=str(project.openwebui_config_id) if project.openwebui_config_id else None,
        milvus_collection=project.milvus_collection,
        source_count=source_count,
        total_files=total_files,
        total_chunks=total_chunks,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a project."""
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.sources))
        .where(Project.id == uid)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for duplicate name
    if data.name and data.name != project.name:
        existing = await db.execute(
            select(Project).where(Project.name == data.name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Project with name '{data.name}' already exists"
            )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    if "github_config_id" in update_data:
        gid = update_data.pop("github_config_id")
        update_data["github_config_id"] = UUID(gid) if gid else None
    if "openwebui_config_id" in update_data:
        oid = update_data.pop("openwebui_config_id")
        update_data["openwebui_config_id"] = UUID(oid) if oid else None
    
    for key, value in update_data.items():
        setattr(project, key, value)
    
    await db.commit()
    await db.refresh(project)
    
    source_count = len(project.sources) if project.sources else 0
    total_files = sum(s.total_files for s in project.sources) if project.sources else 0
    total_chunks = sum(s.total_chunks for s in project.sources) if project.sources else 0
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        is_active=project.is_active,
        github_config_id=str(project.github_config_id) if project.github_config_id else None,
        openwebui_config_id=str(project.openwebui_config_id) if project.openwebui_config_id else None,
        milvus_collection=project.milvus_collection,
        source_count=source_count,
        total_files=total_files,
        total_chunks=total_chunks,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a project and all its sources, including Milvus collection."""
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db.execute(
        select(Project).where(Project.id == uid)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Drop Milvus collection if exists
    collection_dropped = False
    if project.milvus_collection:
        try:
            from pymilvus import connections, utility
            connections.connect(
                alias="delete_project",
                host=settings.MILVUS_HOST,
                port=str(settings.MILVUS_PORT)
            )
            if utility.has_collection(project.milvus_collection, using="delete_project"):
                utility.drop_collection(project.milvus_collection, using="delete_project")
                collection_dropped = True
                logger.info(f"Dropped Milvus collection: {project.milvus_collection}")
            connections.disconnect("delete_project")
        except Exception as e:
            logger.error(f"Failed to drop Milvus collection: {e}")
    
    # Delete project (cascades to sources, files, chunks)
    await db.delete(project)
    await db.commit()
    
    logger.info(f"✅ Deleted project: {project.name} ({project.id})")
    
    return {
        "success": True,
        "message": "Project deleted",
        "milvus_collection_dropped": collection_dropped
    }


@router.post("/{project_id}/reset")
async def reset_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset all data for a project.
    
    Clears: files, chunks, embeddings in PostgreSQL and Milvus.
    Keeps: project configuration and source definitions.
    """
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.sources))
        .where(Project.id == uid)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger.info(f"🗑️ Starting reset for project {uid}")
    
    deleted_chunks = 0
    deleted_files = 0
    source_ids = [s.id for s in project.sources] if project.sources else []
    
    # Delete chunks and files
    for source_id in source_ids:
        # Delete chunks
        chunks_result = await db.execute(
            delete(DocumentChunk)
            .where(DocumentChunk.source_file_id.in_(
                select(SourceFile.id).where(SourceFile.source_id == source_id)
            ))
        )
        deleted_chunks += chunks_result.rowcount or 0
        
        # Delete files
        files_result = await db.execute(
            delete(SourceFile).where(SourceFile.source_id == source_id)
        )
        deleted_files += files_result.rowcount or 0
    
    # Reset source stats
    for source in project.sources:
        source.total_files = 0
        source.processed_files = 0
        source.total_chunks = 0
        source.last_sync_at = None
        source.last_commit_sha = None
        source.status = "pending"
    
    await db.commit()
    
    # Drop Milvus collection
    collection_dropped = False
    if project.milvus_collection:
        try:
            from pymilvus import connections, utility
            connections.connect(
                alias="reset_project",
                host=settings.MILVUS_HOST,
                port=str(settings.MILVUS_PORT)
            )
            if utility.has_collection(project.milvus_collection, using="reset_project"):
                utility.drop_collection(project.milvus_collection, using="reset_project")
                collection_dropped = True
                logger.info(f"Dropped Milvus collection: {project.milvus_collection}")
            connections.disconnect("reset_project")
        except Exception as e:
            logger.error(f"Failed to drop Milvus collection: {e}")
    
    # Clear Redis cache for this project
    cache_cleared = 0
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        async for key in r.scan_iter(f"project:{uid}:*"):
            await r.delete(key)
            cache_cleared += 1
        await r.close()
    except Exception as e:
        logger.error(f"Failed to clear Redis cache: {e}")
    
    logger.info(f"✅ Project reset complete: {deleted_files} files, {deleted_chunks} chunks")
    
    return {
        "success": True,
        "message": "Project reset complete",
        "details": {
            "deleted_files": deleted_files,
            "deleted_chunks": deleted_chunks,
            "milvus_collection_dropped": collection_dropped,
            "cache_keys_cleared": cache_cleared
        }
    }
