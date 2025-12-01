"""
Jobs API endpoints.

Background job management with pause, resume, cancel, restart support.
Uses asyncio for background task execution.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Job, JobLog, JobStatus, JobType, JobPhase
from app.services.job_executor import job_executor
from app.schemas.jobs import (
    JobCreate, JobResponse, JobDetailResponse, 
    JobListResponse, JobActionResponse, JobLogResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


def job_to_response(job: Job) -> JobResponse:
    """Convert Job model to response."""
    return JobResponse(
        id=str(job.id),
        job_type=job.job_type,
        status=job.status,
        phase=job.phase,
        project_id=str(job.project_id) if job.project_id else None,
        source_id=str(job.source_id) if job.source_id else None,
        config=job.config or {},
        total_items=job.total_items,
        processed_items=job.processed_items,
        failed_items=job.failed_items,
        progress_percent=job.progress_percent,
        current_item=job.current_item,
        result=job.result,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        duration_seconds=job.duration_seconds
    )


@router.get("", response_model=JobListResponse)
async def list_jobs(
    project_id: Optional[str] = None,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List jobs with optional filters."""
    query = select(Job).order_by(Job.created_at.desc())
    count_query = select(func.count(Job.id))
    
    # Apply filters
    if project_id:
        try:
            pid = UUID(project_id)
            query = query.where(Job.project_id == pid)
            count_query = count_query.where(Job.project_id == pid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if source_id:
        try:
            sid = UUID(source_id)
            query = query.where(Job.source_id == sid)
            count_query = count_query.where(Job.source_id == sid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid source ID")
    
    if status:
        try:
            job_status = JobStatus(status)
            query = query.where(Job.status == job_status.value)
            count_query = count_query.where(Job.status == job_status.value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    # Execute queries
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    result = await db.execute(query.offset(skip).limit(limit))
    jobs = list(result.scalars().all())
    
    return JobListResponse(
        jobs=[job_to_response(j) for j in jobs],
        total=total
    )


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    data: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create and start a new background job."""
    # Validate job type
    try:
        job_type = JobType(data.job_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job type. Must be one of: {[t.value for t in JobType]}"
        )
    
    # Parse IDs
    pid = None
    sid = None
    
    if data.project_id:
        try:
            pid = UUID(data.project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if data.source_id:
        try:
            sid = UUID(data.source_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid source ID")
    
    # Create job
    job = Job(
        job_type=job_type.value,
        status=JobStatus.PENDING.value,
        phase=JobPhase.INITIALIZATION.value,
        project_id=pid,
        source_id=sid,
        config=data.config
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    logger.info(f"📋 Created job: {job.id} (type: {job.job_type})")
    
    # Start job execution in background
    background_tasks.add_task(job_executor.execute_job, str(job.id))
    
    return job_to_response(job)


@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get job details with logs."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(
        select(Job)
        .options(selectinload(Job.logs))
        .where(Job.id == uid)
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_resp = job_to_response(job)
    
    logs = [
        JobLogResponse(
            id=str(log.id),
            level=log.level,
            message=log.message,
            details=log.details,
            created_at=log.created_at
        )
        for log in (job.logs or [])
    ]
    
    return JobDetailResponse(job=job_resp, logs=logs)


@router.post("/{job_id}/pause", response_model=JobActionResponse)
async def pause_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Pause a running job."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(select(Job).where(Job.id == uid))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.RUNNING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pause job with status '{job.status}'. Job must be running."
        )
    
    # Mark job for pausing in executor
    job_executor.pause_job(job_id)
    
    logger.info(f"⏸️ Pausing job: {job_id}")
    
    return JobActionResponse(
        success=True,
        message="Job pause requested",
        job_id=job_id,
        status=job.status
    )


@router.post("/{job_id}/resume", response_model=JobActionResponse)
async def resume_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Resume a paused job."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(select(Job).where(Job.id == uid))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.PAUSED.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume job with status '{job.status}'. Job must be paused."
        )
    
    # Update status to pending
    job.status = JobStatus.PENDING.value
    await db.commit()
    
    # Remove pause marker
    job_executor.resume_job(job_id)
    
    # Start job execution again
    background_tasks.add_task(job_executor.execute_job, job_id)
    
    logger.info(f"▶️ Resuming job: {job_id}")
    
    return JobActionResponse(
        success=True,
        message="Job resumed",
        job_id=job_id,
        status=JobStatus.RUNNING.value
    )


@router.post("/{job_id}/cancel", response_model=JobActionResponse)
async def cancel_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a running or pending job."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(select(Job).where(Job.id == uid))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in (JobStatus.RUNNING.value, JobStatus.PENDING.value, JobStatus.PAUSED.value):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status '{job.status}'"
        )
    
    # Mark job for cancellation
    job_executor.cancel_job(job_id)
    
    # Update status immediately
    job.status = JobStatus.CANCELLED.value
    await db.commit()
    
    logger.info(f"🛑 Cancelled job: {job_id}")
    
    return JobActionResponse(
        success=True,
        message="Job cancelled",
        job_id=job_id,
        status=JobStatus.CANCELLED.value
    )


@router.post("/{job_id}/restart", response_model=JobResponse)
async def restart_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Restart a job by creating a new one with same config."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(select(Job).where(Job.id == uid))
    old_job = result.scalar_one_or_none()
    
    if not old_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create new job with same config
    new_job = Job(
        job_type=old_job.job_type,
        status=JobStatus.PENDING.value,
        phase=JobPhase.INITIALIZATION.value,
        project_id=old_job.project_id,
        source_id=old_job.source_id,
        config=old_job.config
    )
    
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    
    logger.info(f"🔄 Restarted job {job_id} as {new_job.id}")
    
    # Start job execution
    background_tasks.add_task(job_executor.execute_job, str(new_job.id))
    
    return job_to_response(new_job)


@router.delete("/{job_id}", response_model=JobActionResponse)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a completed, failed, or cancelled job."""
    try:
        uid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    result = await db.execute(select(Job).where(Job.id == uid))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in (JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete job with status '{job.status}'. Job must be completed, failed, or cancelled."
        )
    
    await db.delete(job)
    await db.commit()
    
    logger.info(f"🗑️ Deleted job: {job_id}")
    
    return JobActionResponse(
        success=True,
        message="Job deleted",
        job_id=job_id,
        status=job.status
    )
