"""
Project and Source schemas for API request/response.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# ==================== Project Schemas ====================

class ProjectBase(BaseModel):
    """Base project schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Create project request."""
    github_config_id: Optional[str] = None
    openwebui_config_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Update project request."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    github_config_id: Optional[str] = None
    openwebui_config_id: Optional[str] = None


class ProjectResponse(BaseModel):
    """Project response."""
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    github_config_id: Optional[str]
    openwebui_config_id: Optional[str]
    milvus_collection: Optional[str]
    source_count: int = 0
    total_files: int = 0
    total_chunks: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """List of projects response."""
    projects: List[ProjectResponse]
    total: int


# ==================== Source Schemas ====================

class SourceBase(BaseModel):
    """Base source schema."""
    name: str = Field(..., min_length=1, max_length=200)
    source_type: str = "github"
    repo_url: Optional[str] = None
    branch: str = "main"


class SourceCreate(SourceBase):
    """Create source request."""
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    exclude_folders: Optional[List[str]] = None
    text_extensions: Optional[List[str]] = None
    binary_extensions: Optional[List[str]] = None


class SourceUpdate(BaseModel):
    """Update source request."""
    name: Optional[str] = None
    source_type: Optional[str] = None
    repo_url: Optional[str] = None
    branch: Optional[str] = None
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    exclude_folders: Optional[List[str]] = None
    text_extensions: Optional[List[str]] = None
    binary_extensions: Optional[List[str]] = None


class SourceResponse(BaseModel):
    """Source response."""
    id: str
    project_id: str
    name: str
    source_type: str
    status: str
    repo_url: Optional[str]
    branch: str
    include_patterns: List[str] = []
    exclude_patterns: List[str] = []
    exclude_folders: List[str] = []
    text_extensions: List[str] = []
    binary_extensions: List[str] = []
    last_sync_at: Optional[datetime]
    last_commit_sha: Optional[str]
    sync_error: Optional[str]
    total_files: int
    processed_files: int
    total_chunks: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceListResponse(BaseModel):
    """List of sources response."""
    sources: List[SourceResponse]
    total: int


# ==================== Source File Schemas ====================

class SourceFileResponse(BaseModel):
    """Source file response."""
    id: str
    source_id: str
    file_path: str
    file_name: str
    file_extension: Optional[str]
    file_size_bytes: int
    is_processed: bool
    chunk_count: int
    has_embedding: bool = False
    process_error: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SourceFileListResponse(BaseModel):
    """List of source files response."""
    files: List[SourceFileResponse]
    total: int
    skip: int
    limit: int
