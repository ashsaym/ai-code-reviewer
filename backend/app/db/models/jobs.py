"""
Jobs database models.

Background job tracking with support for pause, resume, cancel, and restart.
Jobs persist across app restarts.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum

from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


def utc_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


class JobType(str, Enum):
    """Job types."""
    SYNC = "sync"              # Sync files from source
    PROCESS = "process"        # Process files (chunking)
    EMBED = "embed"            # Generate embeddings
    FULL_INGEST = "full_ingest"  # Full pipeline: sync + process + embed
    REPROCESS = "reprocess"    # Reprocess existing files
    DELETE_VECTORS = "delete_vectors"  # Delete vectors from Milvus


class JobStatus(str, Enum):
    """Job status."""
    PENDING = "pending"        # Waiting to start
    RUNNING = "running"        # Currently executing
    PAUSED = "paused"          # Paused by user
    COMPLETED = "completed"    # Finished successfully
    FAILED = "failed"          # Failed with error
    CANCELLED = "cancelled"    # Cancelled by user


class JobPhase(str, Enum):
    """Job execution phase."""
    INITIALIZATION = "initialization"
    DISCOVERY = "discovery"      # Finding files
    SYNCING = "syncing"          # Downloading files
    CHUNKING = "chunking"        # Splitting into chunks
    EMBEDDING = "embedding"      # Generating embeddings
    INGESTION = "ingestion"      # Storing in vector DB
    FINALIZATION = "finalization"


class Job(Base):
    """Background job tracking."""
    __tablename__ = "jobs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Job type and status
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=JobStatus.PENDING.value)
    phase: Mapped[str] = mapped_column(String(30), default=JobPhase.INITIALIZATION.value)
    
    # Associated resources
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True
    )
    
    # Configuration (stored as JSON)
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Progress tracking
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    processed_items: Mapped[int] = mapped_column(Integer, default=0)
    failed_items: Mapped[int] = mapped_column(Integer, default=0)
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Current item being processed
    current_item: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    current_item_progress: Mapped[int] = mapped_column(Integer, default=0)
    
    # Results and errors
    result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timing
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Calculated duration in seconds
    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate job duration."""
        if self.started_at:
            end_time = self.completed_at or datetime.now(timezone.utc)
            return (end_time - self.started_at).total_seconds()
        return None
    
    # Relationships
    logs: Mapped[List["JobLog"]] = relationship(
        "JobLog", back_populates="job", cascade="all, delete-orphan",
        order_by="JobLog.created_at"
    )
    
    # Checkpoint for resume capability
    checkpoint: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)


class JobLog(Base):
    """Job execution logs."""
    __tablename__ = "job_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    
    # Log entry
    level: Mapped[str] = mapped_column(String(20), default="info")  # info, warning, error, debug
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Timing
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="logs")
