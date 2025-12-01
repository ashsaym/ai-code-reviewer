"""
Database models.
"""
from app.db.models.settings import (
    OpenWebUIConfig,
    GitHubConfig,
    CacheConfig,
    ProcessingConfig,
    EmbeddingConfig,
    CustomModel,
    DatabaseConfig,
    ChatPromptConfig
)
from app.db.models.projects import (
    Project,
    Source,
    SourceFile,
    DocumentChunk,
    SourceType,
    SourceStatus
)
from app.db.models.jobs import (
    Job,
    JobLog,
    JobType,
    JobStatus,
    JobPhase
)
from app.db.models.chat import (
    ChatSession,
    ChatMessage
)

__all__ = [
    # Settings
    "OpenWebUIConfig",
    "GitHubConfig",
    "CacheConfig",
    "ProcessingConfig",
    "EmbeddingConfig",
    "CustomModel",
    "DatabaseConfig",
    "ChatPromptConfig",
    # Projects
    "Project",
    "Source",
    "SourceFile",
    "DocumentChunk",
    "SourceType",
    "SourceStatus",
    # Jobs
    "Job",
    "JobLog",
    "JobType",
    "JobStatus",
    "JobPhase",
    # Chat
    "ChatSession",
    "ChatMessage",
]
