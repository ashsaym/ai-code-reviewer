"""
Configuration management for InfraMind-AI backend.

All sensitive information is loaded from environment variables.
Caching is DISABLED by default but can be enabled via CACHE_ENABLED=true.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Required environment variables (loaded from GitHub secrets):
    - OPENWEB_API_KEY: OpenWebUI API key for AI features
    - REPO_PAT_TOKEN: GitHub Personal Access Token for repo access
    
    Optional environment variables (with sensible defaults):
    - OPENWEB_API_URL: OpenWebUI API URL
    - OPENWEB_CHAT_MODEL: Default chat model
    - OPENWEB_EMBEDDER_MODEL: Default embedding model
    - OPENWEB_CHAT_CONTEXT_SIZE: Chat context window size
    - OPENWEB_EMBEDDING_CONTEXT_SIZE: Embedding context window size
    - EMBEDDING_DIMENSION: Embedding vector dimension
    """
    
    # Application Configuration
    APP_NAME: str = "InfraMind-AI"
    APP_VERSION: str = "4.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # PostgreSQL Database Configuration
    POSTGRES_DB: str = "inframind-ai"
    POSTGRES_USER: str = "saym"
    POSTGRES_PASSWORD: str = "Saym7296"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    
    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Caching Configuration - DISABLED by default
    CACHE_ENABLED: bool = False
    CACHE_TTL_SECONDS: int = 3600  # 1 hour default TTL
    CACHE_EMBEDDING_TTL_SECONDS: int = 86400  # 24 hours for embeddings
    
    # Vector Database Configuration
    USE_MILVUS: bool = False  # Use Milvus (true) or PGVector/PostgreSQL (false, default)
    
    # Milvus Vector Database Configuration (only used if USE_MILVUS=true)
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    
    # OpenWebUI / LLM Configuration (from environment variables)
    OPENWEB_API_URL: str = "https://open-webui.devhomelab.live/api/v1"
    OPENWEB_API_KEY: str = ""
    OPENWEB_CHAT_MODEL: str = "models/Qwen3-8B-Q8_0.gguf"
    OPENWEB_EMBEDDER_MODEL: str = "models/Qwen3-Embedding-8B-Q8_0.gguf"
    OPENWEB_CHAT_CONTEXT_SIZE: int = 8192
    OPENWEB_EMBEDDING_CONTEXT_SIZE: int = 8192
    
    # Embedding Configuration
    EMBEDDING_DIMENSION: int = 4096
    
    # GitHub Integration (from environment variable)
    REPO_PAT_TOKEN: Optional[str] = None
    GITHUB_HOST: str = "github.com"  # Can be changed for GitHub Enterprise
    GITHUB_API_VERSION: str = "2022-11-28"
    
    # SSL/TLS Configuration
    SSL_VERIFY: bool = True  # Set to False to disable SSL verification (not recommended for production)
    SSL_CA_CERT_PATH: Optional[str] = None  # Path to custom CA certificate file (PEM format)
    SSL_CLIENT_CERT_PATH: Optional[str] = None  # Path to client certificate file (optional)
    SSL_CLIENT_KEY_PATH: Optional[str] = None  # Path to client key file (optional)
    
    # Processing Configuration (defaults)
    DEFAULT_BATCH_SIZE: int = 4
    DEFAULT_MAX_CONCURRENT: int = 5
    DEFAULT_MAX_TOKENS: int = 2000
    DEFAULT_TEMPERATURE: float = 0.7
    CHAT_HISTORY_MAX_MESSAGES: int = 20
    MAX_DOCUMENT_SIZE_MB: float = 10.0
    MAX_CHUNK_SIZE: int = 2000
    CHUNK_OVERLAP: int = 200
    MAX_PARALLEL_FILES: int = 5
    MAX_FILES_PER_BATCH: int = 10
    MAX_DOCUMENTS_PER_BATCH: int = 50
    
    # Parallel chunk processing
    PARALLEL_CHUNKS: int = 6  # Number of chunks to process in parallel
    
    # Embedding configuration
    EMBEDDING_BATCH_SIZE: int = 4
    MAX_CONCURRENT_REQUESTS: int = 5
    
    # Rate limiting
    REQUESTS_PER_MINUTE: int = 60
    TOKENS_PER_MINUTE: int = 100000
    
    # Retry configuration
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 5
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @field_validator("OPENWEB_API_KEY")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Warn if API key is not set."""
        if not v:
            logger.warning(
                "⚠️ OPENWEB_API_KEY is not set! "
                "AI features will not work without a valid API key."
            )
        return v
    
    @field_validator("CACHE_ENABLED", mode="before")
    @classmethod
    def parse_cache_enabled(cls, v) -> bool:
        """Parse cache enabled from string or bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return False
    
    @field_validator("USE_MILVUS", mode="before")
    @classmethod
    def parse_use_milvus(cls, v) -> bool:
        """Parse USE_MILVUS from string or bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return False
    
    @field_validator("SSL_VERIFY", mode="before")
    @classmethod
    def parse_ssl_verify(cls, v) -> bool:
        """Parse SSL_VERIFY from string or bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return True  # Default to True for security
    
    @field_validator("SSL_CA_CERT_PATH")
    @classmethod
    def validate_ca_cert_path(cls, v: Optional[str]) -> Optional[str]:
        """Validate CA certificate file exists if path is provided."""
        if v:
            import os
            if not os.path.isfile(v):
                logger.warning(f"⚠️ SSL_CA_CERT_PATH specified but file not found: {v}")
            else:
                logger.info(f"✅ Using custom CA certificate: {v}")
        return v
    
    @property
    def database_url(self) -> str:
        """Construct async PostgreSQL database URL."""
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def database_url_sync(self) -> str:
        """Construct synchronous PostgreSQL database URL for Alembic."""
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def redis_url(self) -> str:
        """Construct Redis URL with authentication."""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def milvus_uri(self) -> str:
        """Construct Milvus connection URI."""
        return f"http://{self.MILVUS_HOST}:{self.MILVUS_PORT}"


# Global settings instance
settings = Settings()
