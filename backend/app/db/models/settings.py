"""
Settings database models.

Stores configuration for OpenWebUI, GitHub, Cache, Processing, etc.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Boolean, Integer, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


def utc_now() -> datetime:
    """Get current UTC time."""
    return datetime.now(timezone.utc)


class OpenWebUIConfig(Base):
    """OpenWebUI API configuration."""
    __tablename__ = "openwebui_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    api_url: Mapped[str] = mapped_column(String(500), nullable=False)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Default models
    default_chat_model: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    default_embedding_model: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Context sizes
    chat_context_size: Mapped[int] = mapped_column(Integer, default=8192)
    embedding_context_size: Mapped[int] = mapped_column(Integer, default=8192)
    embedding_dimension: Mapped[int] = mapped_column(Integer, default=4096)
    
    # Processing defaults
    default_temperature: Mapped[float] = mapped_column(Float, default=0.7)
    default_max_tokens: Mapped[int] = mapped_column(Integer, default=2000)
    chat_history_max_messages: Mapped[int] = mapped_column(Integer, default=20)
    
    # Status
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GitHubConfig(Base):
    """GitHub API configuration."""
    __tablename__ = "github_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    host: Mapped[str] = mapped_column(String(200), default="github.com")
    api_version: Mapped[str] = mapped_column(String(20), default="2022-11-28")
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pat_token: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Status
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class CacheConfig(Base):
    """Cache configuration."""
    __tablename__ = "cache_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Cache settings
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)  # Disabled by default
    ttl_seconds: Mapped[int] = mapped_column(Integer, default=3600)
    embedding_ttl_seconds: Mapped[int] = mapped_column(Integer, default=86400)
    max_cache_size_mb: Mapped[int] = mapped_column(Integer, default=1024)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ProcessingConfig(Base):
    """Processing configuration."""
    __tablename__ = "processing_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Batch processing
    default_batch_size: Mapped[int] = mapped_column(Integer, default=4)
    max_concurrent: Mapped[int] = mapped_column(Integer, default=5)
    max_parallel_files: Mapped[int] = mapped_column(Integer, default=5)
    max_files_per_batch: Mapped[int] = mapped_column(Integer, default=10)
    max_documents_per_batch: Mapped[int] = mapped_column(Integer, default=50)
    
    # Chunking
    max_chunk_size: Mapped[int] = mapped_column(Integer, default=2000)
    chunk_overlap: Mapped[int] = mapped_column(Integer, default=200)
    max_document_size_mb: Mapped[float] = mapped_column(Float, default=10.0)
    
    # Parallel chunk processing
    parallel_chunks: Mapped[int] = mapped_column(Integer, default=6)
    
    # Embedding configuration
    embedding_batch_size: Mapped[int] = mapped_column(Integer, default=4)
    max_concurrent_requests: Mapped[int] = mapped_column(Integer, default=5)
    
    # Rate limiting
    requests_per_minute: Mapped[int] = mapped_column(Integer, default=60)
    tokens_per_minute: Mapped[int] = mapped_column(Integer, default=100000)
    
    # Retry configuration
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    retry_delay_seconds: Mapped[int] = mapped_column(Integer, default=5)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class EmbeddingConfig(Base):
    """Embedding configuration."""
    __tablename__ = "embedding_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Model settings
    model_name: Mapped[str] = mapped_column(String(200), nullable=True)
    dimension: Mapped[int] = mapped_column(Integer, default=4096)
    context_size: Mapped[int] = mapped_column(Integer, default=8192)
    
    # Batch settings
    batch_size: Mapped[int] = mapped_column(Integer, default=4)
    max_concurrent_requests: Mapped[int] = mapped_column(Integer, default=2)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class CustomModel(Base):
    """User-defined custom models."""
    __tablename__ = "custom_models"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    model_type: Mapped[str] = mapped_column(String(20), nullable=False)  # chat or embedding
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Model parameters
    context_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class DatabaseConfig(Base):
    """Database configuration for management operations."""
    __tablename__ = "database_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # PostgreSQL
    postgres_host: Mapped[str] = mapped_column(String(200), default="localhost")
    postgres_port: Mapped[int] = mapped_column(Integer, default=5432)
    postgres_db: Mapped[str] = mapped_column(String(100), default="inframind-ai")
    
    # Redis  
    redis_host: Mapped[str] = mapped_column(String(200), default="localhost")
    redis_port: Mapped[int] = mapped_column(Integer, default=6379)
    
    # Milvus
    milvus_host: Mapped[str] = mapped_column(String(200), default="localhost")
    milvus_port: Mapped[int] = mapped_column(Integer, default=19530)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ChatPromptConfig(Base):
    """
    Chat prompt configuration.
    
    Stores customizable system prompts for RAG chat.
    Each project can have its own prompt configuration.
    """
    __tablename__ = "chat_prompt_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Link to project (null for global default)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    
    # Prompt name
    name: Mapped[str] = mapped_column(String(100), default="Default RAG Prompt")
    
    # System prompt template
    # Variables: {project_name}, {context}, {file_info}
    system_prompt: Mapped[str] = mapped_column(Text, default="""You are an AI coding assistant helping with the project "{project_name}".

IMPORTANT: You MUST only answer questions based on the provided context from the codebase.
If the context doesn't contain relevant information to answer the question, respond with:
"I couldn't find relevant information in the indexed codebase to answer this question. The files that were searched include: {file_list}"

Context from the codebase:
{context}

File relevance information:
{file_info}

Guidelines:
- Always cite specific file paths when referencing code
- Show which files your answer is based on with relevance percentages
- If multiple files are relevant, explain how they relate
- Be specific and technical in your responses
- If you're unsure, say so rather than guessing""")
    
    # No data found response
    no_data_response: Mapped[str] = mapped_column(Text, default="""I couldn't find any relevant data in the indexed codebase for project "{project_name}".

This could be because:
1. No files have been synced and processed yet
2. No embeddings have been generated
3. The question is unrelated to the codebase content

Please ensure files are synced, processed, and embedded before asking questions about the code.""")
    
    # Response format for file relevance
    file_relevance_format: Mapped[str] = mapped_column(
        Text, 
        default="{file_path}: {relevance_percent}% relevant\nSnippet: {snippet}"
    )
    
    # Settings
    include_file_relevance: Mapped[bool] = mapped_column(Boolean, default=True)
    max_context_chunks: Mapped[int] = mapped_column(Integer, default=5)
    min_relevance_threshold: Mapped[float] = mapped_column(Float, default=0.1)  # 10% minimum relevance
    
    # Status
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
