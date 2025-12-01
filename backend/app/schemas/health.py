"""
Health check schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DatabaseHealth(BaseModel):
    """Database health status."""
    postgres: bool = False
    redis: bool = False
    milvus: bool = False


class HealthResponse(BaseModel):
    """Health check response."""
    status: str  # healthy, degraded, unhealthy
    databases: DatabaseHealth
    uptime_seconds: float
    version: str
    timestamp: datetime


class QuickHealthResponse(BaseModel):
    """Quick health check for load balancers."""
    status: str = "ok"


class DetailedHealthResponse(BaseModel):
    """Detailed health check with diagnostics."""
    status: str
    services: dict
    issues: list
    recommendations: list
    uptime_seconds: float
