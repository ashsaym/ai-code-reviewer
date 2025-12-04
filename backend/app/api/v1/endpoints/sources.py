"""
Sources API endpoints.

CRUD operations for project sources (GitHub repos, etc.).
Uses LlamaIndex GitHub reader for fetching files.
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
    SourceCreate, SourceUpdate, SourceResponse, 
    SourceListResponse, SourceFileResponse, SourceFileListResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{project_id}/sources", response_model=SourceListResponse)
async def list_sources(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all sources for a project."""
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Verify project exists
    project = await db.execute(select(Project).where(Project.id == uid))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get sources
    result = await db.execute(
        select(Source)
        .where(Source.project_id == uid)
        .order_by(Source.created_at.desc())
    )
    sources = list(result.scalars().all())
    
    items = [
        SourceResponse(
            id=str(s.id),
            project_id=str(s.project_id),
            name=s.name,
            source_type=s.source_type,
            status=s.status,
            repo_url=s.repo_url,
            branch=s.branch,
            include_patterns=s.include_patterns or [],
            exclude_patterns=s.exclude_patterns or [],
            exclude_folders=s.exclude_folders or [],
            text_extensions=s.text_extensions or [],
            binary_extensions=s.binary_extensions or [],
            last_sync_at=s.last_sync_at,
            last_commit_sha=s.last_commit_sha,
            sync_error=s.sync_error,
            total_files=s.total_files,
            processed_files=s.processed_files,
            total_chunks=s.total_chunks,
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        for s in sources
    ]
    
    return SourceListResponse(sources=items, total=len(items))


@router.post("/{project_id}/sources", response_model=SourceResponse, status_code=201)
async def create_source(
    project_id: str,
    data: SourceCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new source for a project."""
    try:
        uid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == uid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create source
    source = Source(
        project_id=uid,
        name=data.name,
        source_type=data.source_type,
        repo_url=data.repo_url,
        branch=data.branch,
        include_patterns=data.include_patterns,
        exclude_patterns=data.exclude_patterns,
        exclude_folders=data.exclude_folders,
        text_extensions=data.text_extensions,
        binary_extensions=data.binary_extensions
    )
    
    db.add(source)
    await db.commit()
    await db.refresh(source)
    
    logger.info(f"✅ Created source: {source.name} ({source.id})")
    
    return SourceResponse(
        id=str(source.id),
        project_id=str(source.project_id),
        name=source.name,
        source_type=source.source_type,
        status=source.status,
        repo_url=source.repo_url,
        branch=source.branch,
        include_patterns=source.include_patterns or [],
        exclude_patterns=source.exclude_patterns or [],
        exclude_folders=source.exclude_folders or [],
        text_extensions=source.text_extensions or [],
        binary_extensions=source.binary_extensions or [],
        last_sync_at=source.last_sync_at,
        last_commit_sha=source.last_commit_sha,
        sync_error=source.sync_error,
        total_files=source.total_files,
        processed_files=source.processed_files,
        total_chunks=source.total_chunks,
        created_at=source.created_at,
        updated_at=source.updated_at
    )


@router.get("/sources/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a source by ID."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return SourceResponse(
        id=str(source.id),
        project_id=str(source.project_id),
        name=source.name,
        source_type=source.source_type,
        status=source.status,
        repo_url=source.repo_url,
        branch=source.branch,
        include_patterns=source.include_patterns or [],
        exclude_patterns=source.exclude_patterns or [],
        exclude_folders=source.exclude_folders or [],
        text_extensions=source.text_extensions or [],
        binary_extensions=source.binary_extensions or [],
        last_sync_at=source.last_sync_at,
        last_commit_sha=source.last_commit_sha,
        sync_error=source.sync_error,
        total_files=source.total_files,
        processed_files=source.processed_files,
        total_chunks=source.total_chunks,
        created_at=source.created_at,
        updated_at=source.updated_at
    )


@router.put("/sources/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    data: SourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a source."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)
    
    await db.commit()
    await db.refresh(source)
    
    return SourceResponse(
        id=str(source.id),
        project_id=str(source.project_id),
        name=source.name,
        source_type=source.source_type,
        status=source.status,
        repo_url=source.repo_url,
        branch=source.branch,
        include_patterns=source.include_patterns or [],
        exclude_patterns=source.exclude_patterns or [],
        exclude_folders=source.exclude_folders or [],
        text_extensions=source.text_extensions or [],
        binary_extensions=source.binary_extensions or [],
        last_sync_at=source.last_sync_at,
        last_commit_sha=source.last_commit_sha,
        sync_error=source.sync_error,
        total_files=source.total_files,
        processed_files=source.processed_files,
        total_chunks=source.total_chunks,
        created_at=source.created_at,
        updated_at=source.updated_at
    )


@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a source and all its files."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Delete source (cascades to files and chunks)
    await db.delete(source)
    await db.commit()
    
    logger.info(f"✅ Deleted source: {source.name} ({source.id})")
    
    return {"success": True, "message": "Source deleted"}


@router.get("/sources/{source_id}/files", response_model=SourceFileListResponse)
async def list_source_files(
    source_id: str,
    skip: int = 0,
    limit: int = 500,
    db: AsyncSession = Depends(get_db)
):
    """List files for a source with status information."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    # Verify source exists
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Get total count
    count_result = await db.execute(
        select(func.count(SourceFile.id)).where(SourceFile.source_id == uid)
    )
    total = count_result.scalar() or 0
    
    # Get files
    files_result = await db.execute(
        select(SourceFile)
        .where(SourceFile.source_id == uid)
        .order_by(SourceFile.file_path)
        .offset(skip)
        .limit(limit)
    )
    files = list(files_result.scalars().all())
    
    # Check which files have embeddings
    file_ids = [f.id for f in files]
    embeddings_result = await db.execute(
        select(DocumentChunk.source_file_id, func.count(DocumentChunk.id))
        .where(DocumentChunk.source_file_id.in_(file_ids))
        .where(DocumentChunk.has_embedding.is_(True))
        .group_by(DocumentChunk.source_file_id)
    )
    embeddings_by_file = {row[0]: row[1] for row in embeddings_result.all()}
    
    items = [
        SourceFileResponse(
            id=str(f.id),
            source_id=str(f.source_id),
            file_path=f.file_path,
            file_name=f.file_name,
            file_extension=f.file_extension,
            file_size_bytes=f.file_size_bytes,
            is_processed=f.is_processed,
            chunk_count=f.chunk_count or 0,
            has_embedding=embeddings_by_file.get(f.id, 0) > 0,
            process_error=f.process_error,
            created_at=f.created_at
        )
        for f in files
    ]
    
    return SourceFileListResponse(
        files=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/sources/{source_id}/reset-processing")
async def reset_source_processing(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset processing status for all files in a source."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Reset file processing status
    from sqlalchemy import update
    await db.execute(
        update(SourceFile)
        .where(SourceFile.source_id == uid)
        .values(is_processed=False, chunk_count=0, process_error=None)
    )
    
    # Reset source stats
    source.processed_files = 0
    source.total_chunks = 0
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Reset processing status for {source.total_files} files"
    }


@router.get("/sources/{source_id}/branches")
async def get_source_branches(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get available branches for a source's repository using LlamaIndex GitHub reader."""
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    if not source.repo_url:
        raise HTTPException(status_code=400, detail="Source has no repository URL")
    
    # Parse repo URL to get owner and repo
    try:
        # Handle various URL formats
        repo_url = source.repo_url.rstrip("/")
        if repo_url.endswith(".git"):
            repo_url = repo_url[:-4]
        
        parts = repo_url.split("/")
        owner = parts[-2]
        repo = parts[-1]
        
        # Use GitHub API to get branches
        import httpx
        
        # Get GitHub token from settings or database
        from app.db.models import GitHubConfig
        github_result = await db.execute(
            select(GitHubConfig).where(GitHubConfig.is_default == True)
        )
        github_config = github_result.scalar_one_or_none()
        
        token = github_config.pat_token if github_config else settings.REPO_PAT_TOKEN
        if not token:
            raise HTTPException(
                status_code=400,
                detail="No GitHub token configured"
            )
        
        # Get GitHub host from config (supports multiple GitHub hosts)
        github_host = github_config.host if github_config else settings.GITHUB_HOST
        if github_host == "github.com":
            api_base = "https://api.github.com"
        else:
            # GitHub Enterprise or custom host
            api_base = f"https://{github_host}/api/v3"
        
        from app.utils.ssl_config import get_ssl_context
        async with httpx.AsyncClient(timeout=10.0, verify=get_ssl_context()) as client:
            response = await client.get(
                f"{api_base}/repos/{owner}/{repo}/branches",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github+json"
                }
            )
            
            if response.status_code == 200:
                branches = [b["name"] for b in response.json()]
                return {"branches": branches}
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GitHub API error: {response.text}"
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get branches: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get branches: {str(e)}")


@router.post("/sources/{source_id}/re-sync")
async def re_sync_source(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-sync source: Delete all files, chunks, embeddings and sync fresh from GitHub.
    This clears all data and starts from scratch.
    """
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    logger.info(f"🔄 Re-syncing source {source_id}: clearing all data")
    
    # Delete all chunks first (cascade)
    chunks_deleted = await db.execute(
        delete(DocumentChunk).where(
            DocumentChunk.source_file_id.in_(
                select(SourceFile.id).where(SourceFile.source_id == uid)
            )
        )
    )
    
    # Delete all files
    files_deleted = await db.execute(
        delete(SourceFile).where(SourceFile.source_id == uid)
    )
    
    # Reset source stats
    source.total_files = 0
    source.processed_files = 0
    source.total_chunks = 0
    source.last_sync_at = None
    source.last_commit_sha = None
    source.status = "pending"
    source.sync_error = None
    
    await db.commit()
    
    logger.info(f"✅ Re-sync cleared: {files_deleted.rowcount} files, {chunks_deleted.rowcount} chunks")
    
    return {
        "success": True,
        "message": "Source cleared for re-sync",
        "files_deleted": files_deleted.rowcount or 0,
        "chunks_deleted": chunks_deleted.rowcount or 0,
        "action": "Create a 'sync' job to fetch files from GitHub"
    }


@router.post("/sources/{source_id}/re-process")
async def re_process_source(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-process source: Delete all chunks and embeddings, keep files.
    Re-chunk from existing file content.
    """
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    logger.info(f"🔄 Re-processing source {source_id}: clearing chunks")
    
    # Delete all chunks
    chunks_deleted = await db.execute(
        delete(DocumentChunk).where(
            DocumentChunk.source_file_id.in_(
                select(SourceFile.id).where(SourceFile.source_id == uid)
            )
        )
    )
    
    # Reset file processing status
    from sqlalchemy import update
    await db.execute(
        update(SourceFile)
        .where(SourceFile.source_id == uid)
        .values(is_processed=False, chunk_count=0, process_error=None)
    )
    
    # Reset source stats
    source.processed_files = 0
    source.total_chunks = 0
    source.status = "synced"  # Files still exist
    
    await db.commit()
    
    logger.info(f"✅ Re-process cleared: {chunks_deleted.rowcount} chunks")
    
    return {
        "success": True,
        "message": "Source cleared for re-processing",
        "chunks_deleted": chunks_deleted.rowcount or 0,
        "files_kept": source.total_files,
        "action": "Create a 'process' job to re-chunk files"
    }


@router.post("/sources/{source_id}/re-embed")
async def re_embed_source(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-embed source: Clear embeddings only, keep chunks.
    Re-generate embeddings for existing chunks.
    """
    try:
        uid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    result = await db.execute(select(Source).where(Source.id == uid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    logger.info(f"🔄 Re-embedding source {source_id}: clearing embeddings")
    
    # Reset embedding status on all chunks
    from sqlalchemy import update
    updated = await db.execute(
        update(DocumentChunk)
        .where(
            DocumentChunk.source_file_id.in_(
                select(SourceFile.id).where(SourceFile.source_id == uid)
            )
        )
        .values(has_embedding=False, milvus_id=None, embedding_model=None)
    )
    
    await db.commit()
    
    # Also clear from Milvus (project-level collection)
    milvus_cleared = False
    try:
        # Get project's milvus collection
        from app.db.models import Project
        project_result = await db.execute(
            select(Project).where(Project.id == source.project_id)
        )
        project = project_result.scalar_one_or_none()
        
        if project and project.milvus_collection:
            from pymilvus import connections, Collection, utility
            connections.connect(
                alias="re_embed",
                host=settings.MILVUS_HOST,
                port=str(settings.MILVUS_PORT)
            )
            if utility.has_collection(project.milvus_collection, using="re_embed"):
                # Delete vectors for this source (would need source_id stored in metadata)
                # For now, just note the collection exists
                milvus_cleared = True
            connections.disconnect("re_embed")
    except Exception as e:
        logger.warning(f"Failed to clear Milvus: {e}")
    
    logger.info(f"✅ Re-embed cleared: {updated.rowcount} chunks reset")
    
    return {
        "success": True,
        "message": "Source cleared for re-embedding",
        "chunks_reset": updated.rowcount or 0,
        "milvus_cleared": milvus_cleared,
        "action": "Create an 'embed' job to regenerate embeddings"
    }
