"""
Job schemas for API request/response.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    """Create job request."""
    job_type: str = Field(..., description="Type of job: sync, process, embed, full_ingest, reprocess, delete_vectors")
    project_id: Optional[str] = None
    source_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class JobResponse(BaseModel):
    """Job response."""
    id: str
    job_type: str
    status: str
    phase: str
    project_id: Optional[str]
    source_id: Optional[str]
    config: Dict[str, Any] = {}
    total_items: int
    processed_items: int
    failed_items: int
    progress_percent: float
    current_item: Optional[str]
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]

    class Config:
        from_attributes = True


class JobLogResponse(BaseModel):
    """Job log entry response."""
    id: str
    level: str
    message: str
    details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class JobDetailResponse(BaseModel):
    """Job detail with logs."""
    job: JobResponse
    logs: List[JobLogResponse]


class JobListResponse(BaseModel):
    """List of jobs response."""
    jobs: List[JobResponse]
    total: int


class JobActionResponse(BaseModel):
    """Job action response."""
    success: bool
    message: str
    job_id: str
    status: str
