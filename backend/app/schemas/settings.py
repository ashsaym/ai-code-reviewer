"""
Settings schemas for API request/response.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# ==================== OpenWebUI Config ====================

class OpenWebUIConfigBase(BaseModel):
    """Base OpenWebUI config schema."""
    name: str = Field(..., min_length=1, max_length=100)
    api_url: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1)
    default_chat_model: Optional[str] = None
    default_embedding_model: Optional[str] = None
    chat_context_size: int = 8192
    embedding_context_size: int = 8192
    embedding_dimension: int = 4096
    default_temperature: float = 0.7
    default_max_tokens: int = 2000
    chat_history_max_messages: int = 20
    is_default: bool = False
    is_active: bool = True


class OpenWebUIConfigCreate(OpenWebUIConfigBase):
    """Create OpenWebUI config."""
    pass


class OpenWebUIConfigUpdate(BaseModel):
    """Update OpenWebUI config."""
    name: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    default_chat_model: Optional[str] = None
    default_embedding_model: Optional[str] = None
    chat_context_size: Optional[int] = None
    embedding_context_size: Optional[int] = None
    embedding_dimension: Optional[int] = None
    default_temperature: Optional[float] = None
    default_max_tokens: Optional[int] = None
    chat_history_max_messages: Optional[int] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class OpenWebUIConfigResponse(BaseModel):
    """OpenWebUI config response."""
    id: UUID
    name: str
    api_url: str
    api_key: str  # Will be masked in response
    default_chat_model: Optional[str]
    default_embedding_model: Optional[str]
    chat_context_size: int
    embedding_context_size: int
    embedding_dimension: int
    default_temperature: float
    default_max_tokens: int
    chat_history_max_messages: int
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OpenWebUIConfigList(BaseModel):
    """List of OpenWebUI configs."""
    configs: List[OpenWebUIConfigResponse]
    total: int


# ==================== GitHub Config ====================

class GitHubConfigBase(BaseModel):
    """Base GitHub config schema."""
    name: str = Field(..., min_length=1, max_length=100)
    host: str = "github.com"
    api_version: str = "2022-11-28"
    username: Optional[str] = None
    pat_token: str = Field(..., min_length=1)


class GitHubConfigCreate(GitHubConfigBase):
    """Create GitHub config."""
    pass


class GitHubConfigUpdate(BaseModel):
    """Update GitHub config."""
    name: Optional[str] = None
    host: Optional[str] = None
    api_version: Optional[str] = None
    username: Optional[str] = None
    pat_token: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class GitHubConfigResponse(BaseModel):
    """GitHub config response (token masked)."""
    id: str
    name: str
    host: str
    api_version: str
    username: Optional[str]
    pat_token_masked: str
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GitHubConfigList(BaseModel):
    """List of GitHub configs."""
    configs: List[GitHubConfigResponse]
    total: int


# ==================== Cache Config ====================

class CacheConfigBase(BaseModel):
    """Base cache config schema."""
    enabled: bool = False
    ttl_seconds: int = 3600
    embedding_ttl_seconds: int = 86400
    max_cache_size_mb: int = 1024


class CacheConfigUpdate(BaseModel):
    """Update cache config."""
    enabled: Optional[bool] = None
    ttl_seconds: Optional[int] = None
    embedding_ttl_seconds: Optional[int] = None
    max_cache_size_mb: Optional[int] = None


class CacheConfigResponse(BaseModel):
    """Cache config response."""
    id: UUID
    enabled: bool
    ttl_seconds: int
    embedding_ttl_seconds: int
    max_cache_size_mb: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CacheStats(BaseModel):
    """Cache statistics."""
    connected: bool
    keys_count: int = 0
    used_memory: str = "0B"
    embedding_keys: int = 0


class CacheClearResponse(BaseModel):
    """Cache clear response."""
    success: bool
    keys_deleted: int
    message: str


# ==================== Processing Config ====================

class ProcessingConfigBase(BaseModel):
    """Base processing config schema."""
    default_batch_size: int = 4
    max_concurrent: int = 5
    max_parallel_files: int = 5
    max_files_per_batch: int = 10
    max_documents_per_batch: int = 50
    max_chunk_size: int = 2000
    chunk_overlap: int = 200
    max_document_size_mb: float = 10.0
    parallel_chunks: int = 6  # Number of chunks to process in parallel
    embedding_batch_size: int = 4
    max_concurrent_requests: int = 5
    requests_per_minute: int = 60
    tokens_per_minute: int = 100000
    max_retries: int = 3
    retry_delay_seconds: int = 5


class ProcessingConfigUpdate(BaseModel):
    """Update processing config."""
    default_batch_size: Optional[int] = None
    max_concurrent: Optional[int] = None
    max_parallel_files: Optional[int] = None
    max_files_per_batch: Optional[int] = None
    max_documents_per_batch: Optional[int] = None
    max_chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    max_document_size_mb: Optional[float] = None
    parallel_chunks: Optional[int] = None
    embedding_batch_size: Optional[int] = None
    max_concurrent_requests: Optional[int] = None
    requests_per_minute: Optional[int] = None
    tokens_per_minute: Optional[int] = None
    max_retries: Optional[int] = None
    retry_delay_seconds: Optional[int] = None


class ProcessingConfigResponse(BaseModel):
    """Processing config response."""
    id: UUID
    default_batch_size: int
    max_concurrent: int
    max_parallel_files: int
    max_files_per_batch: int
    max_documents_per_batch: int
    max_chunk_size: int
    chunk_overlap: int
    max_document_size_mb: float
    parallel_chunks: int
    embedding_batch_size: int
    max_concurrent_requests: int
    requests_per_minute: int
    tokens_per_minute: int
    max_retries: int
    retry_delay_seconds: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Embedding Config ====================

class EmbeddingConfigBase(BaseModel):
    """Base embedding config schema."""
    model_name: Optional[str] = None
    dimension: int = 4096
    context_size: int = 8192
    batch_size: int = 4
    max_concurrent_requests: int = 2


class EmbeddingConfigUpdate(BaseModel):
    """Update embedding config."""
    model_name: Optional[str] = None
    dimension: Optional[int] = None
    context_size: Optional[int] = None
    batch_size: Optional[int] = None
    max_concurrent_requests: Optional[int] = None


class EmbeddingConfigResponse(BaseModel):
    """Embedding config response."""
    id: UUID
    model_name: Optional[str]
    dimension: int
    context_size: int
    batch_size: int
    max_concurrent_requests: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Custom Model ====================

class CustomModelBase(BaseModel):
    """Base custom model schema."""
    name: str = Field(..., min_length=1, max_length=100)
    model_id: str = Field(..., min_length=1, max_length=200)
    model_type: str = Field(..., pattern="^(chat|embedding)$")
    description: Optional[str] = None
    context_size: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_active: bool = True


class CustomModelCreate(CustomModelBase):
    """Create custom model."""
    pass


class CustomModelUpdate(BaseModel):
    """Update custom model."""
    name: Optional[str] = None
    model_id: Optional[str] = None
    model_type: Optional[str] = None
    description: Optional[str] = None
    context_size: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None


class CustomModelResponse(BaseModel):
    """Custom model response."""
    id: UUID
    name: str
    model_id: str
    model_type: str
    description: Optional[str]
    context_size: Optional[int]
    temperature: Optional[float]
    max_tokens: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomModelList(BaseModel):
    """List of custom models."""
    models: List[CustomModelResponse]
    total: int


# ==================== Database Config ====================

class DatabaseConfigUpdate(BaseModel):
    """Update database config."""
    postgres_host: Optional[str] = None
    postgres_port: Optional[int] = None
    postgres_db: Optional[str] = None
    redis_host: Optional[str] = None
    redis_port: Optional[int] = None
    milvus_host: Optional[str] = None
    milvus_port: Optional[int] = None


class DatabaseConfigResponse(BaseModel):
    """Database config response."""
    id: UUID
    postgres_host: str
    postgres_port: int
    postgres_db: str
    redis_host: str
    redis_port: int
    milvus_host: str
    milvus_port: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Available Models ====================

class AvailableModels(BaseModel):
    """Available models from OpenWebUI."""
    models: List[str]
    chat_models: List[str]
    embedding_models: List[str]
