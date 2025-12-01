"""
Projects and Sources database models.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum

from sqlalchemy import String, Boolean, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from app.db.session import Base


def utc_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


class SourceType(str, Enum):
    """Source types."""
    GITHUB = "github"
    LOCAL = "local"
    WEB = "web"


class SourceStatus(str, Enum):
    """Source processing status."""
    PENDING = "pending"
    SYNCING = "syncing"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Project(Base):
    """Project model - container for sources and configurations."""
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Linked GitHub config (optional)
    github_config_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("github_configs.id"), nullable=True
    )
    
    # Linked OpenWebUI config (optional)
    openwebui_config_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("openwebui_configs.id"), nullable=True
    )
    
    # Milvus collection name
    milvus_collection: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    
    # Relationships
    sources: Mapped[List["Source"]] = relationship(
        "Source", back_populates="project", cascade="all, delete-orphan"
    )


class Source(Base):
    """Source model - GitHub repo, local files, etc."""
    __tablename__ = "sources"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), default=SourceType.GITHUB.value)
    status: Mapped[str] = mapped_column(String(20), default=SourceStatus.PENDING.value)
    
    # GitHub specific
    repo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    branch: Mapped[str] = mapped_column(String(100), default="main")
    last_commit_sha: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    
    # File patterns (stored as JSON arrays)
    include_patterns: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    exclude_patterns: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    exclude_folders: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    text_extensions: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    binary_extensions: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    # Statistics
    total_files: Mapped[int] = mapped_column(Integer, default=0)
    processed_files: Mapped[int] = mapped_column(Integer, default=0)
    total_chunks: Mapped[int] = mapped_column(Integer, default=0)
    
    # Sync info
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="sources")
    files: Mapped[List["SourceFile"]] = relationship(
        "SourceFile", back_populates="source", cascade="all, delete-orphan"
    )


class SourceFile(Base):
    """Individual file from a source."""
    __tablename__ = "source_files"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )
    
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_extension: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    
    # Raw content from source (stored temporarily for processing)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Content hash for change detection
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    
    # File metadata as JSON
    file_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Processing status
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    process_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    
    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="files")
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="source_file", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    """Chunk of text from a source file."""
    __tablename__ = "document_chunks"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False
    )
    
    # Chunk content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Chunk metadata as JSON (includes file_path, etc.)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Position info
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Embedding status
    has_embedding: Mapped[bool] = mapped_column(Boolean, default=False)
    embedding_model: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Milvus reference
    milvus_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    source_file: Mapped["SourceFile"] = relationship("SourceFile", back_populates="chunks")
