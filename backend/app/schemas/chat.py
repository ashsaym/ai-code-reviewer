"""
Chat schemas for API request/response.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


# ==================== Top K Configuration ====================

TopKMode = Literal["auto", "manual"]
TopKValue = Literal[5, 10, 25, 50, 100, 500]


class TopKConfig(BaseModel):
    """Configuration for RAG top_k retrieval."""
    mode: TopKMode = Field(default="auto", description="'auto' calculates based on indexed docs, 'manual' uses fixed value")
    value: Optional[TopKValue] = Field(default=None, description="Fixed top_k value when mode is 'manual'")
    auto_min: int = Field(default=5, description="Minimum top_k for auto mode")
    auto_max: int = Field(default=100, description="Maximum top_k for auto mode")
    auto_percent: float = Field(default=0.1, ge=0, le=1, description="Percentage of total chunks to retrieve in auto mode")


# ==================== Chat Message ====================

class ChatMessageInput(BaseModel):
    """Chat message input."""
    role: str = Field(..., description="Message role: user, assistant, system")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat completion request."""
    messages: List[ChatMessageInput] = Field(..., description="Chat messages")
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_tokens: Optional[int] = Field(None, ge=1)
    stream: bool = False


class ChatResponse(BaseModel):
    """Chat completion response."""
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    message_id: Optional[str] = None  # For regenerate/edit support


# ==================== Embedding ====================

class EmbeddingRequest(BaseModel):
    """Single embedding request."""
    text: str = Field(..., min_length=1)


class EmbeddingBatchRequest(BaseModel):
    """Batch embedding request."""
    texts: List[str] = Field(..., min_length=1, max_length=100)


class EmbeddingResponse(BaseModel):
    """Embedding response."""
    embedding: List[float]
    dimension: int
    model: str


class EmbeddingBatchResponse(BaseModel):
    """Batch embedding response."""
    embeddings: List[List[float]]
    count: int
    dimension: int
    model: str


# ==================== File Relevance ====================

class FileRelevance(BaseModel):
    """File relevance information for RAG responses."""
    file_path: str
    file_name: str
    relevance_percent: float = Field(..., ge=0, le=100)
    chunk_count: int = 0
    snippet: str = ""
    chunk_ids: List[str] = []
    
    class Config:
        from_attributes = True


class FileContentResponse(BaseModel):
    """File content with relevant snippets."""
    file_path: str
    file_name: str
    full_content: Optional[str] = None
    relevant_snippets: List[Dict[str, Any]] = []
    total_chunks: int = 0
    relevance_percent: float = 0


# ==================== Project Chat (RAG) ====================

class ProjectChatRequest(BaseModel):
    """Project chat request with RAG."""
    project_id: str
    message: str
    session_id: Optional[str] = None
    include_history: bool = True
    top_k_config: Optional[TopKConfig] = Field(default=None, description="Top K retrieval configuration")
    top_k: Optional[int] = Field(default=None, ge=1, le=500, description="Legacy: fixed top_k value (use top_k_config instead)")
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_tokens: Optional[int] = Field(None, ge=1)
    min_relevance: float = Field(default=0.1, ge=0, le=1, description="Minimum relevance threshold (0-1)")
    stream: bool = Field(default=False, description="Enable streaming response")


class RetrievedContext(BaseModel):
    """Retrieved context from vector store."""
    text: str
    score: float
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    chunk_index: Optional[int] = None
    chunk_id: Optional[str] = None
    token_count: Optional[int] = None  # For token optimization


class ProjectChatResponse(BaseModel):
    """Project chat response with file relevance."""
    content: str
    session_id: str
    message_id: str  # For regenerate/edit support
    has_context: bool = False
    contexts: List[RetrievedContext] = []
    file_relevance: List[FileRelevance] = []
    model: str
    message: Optional[str] = None  # Additional message like "no data found"
    top_k_used: int = 0  # Actual top_k used for retrieval
    total_indexed_chunks: int = 0  # Total chunks in the index
    tokens_used: Optional[int] = None  # Tokens sent to LLM (for optimization tracking)


# ==================== Chat Controls ====================

class StopChatRequest(BaseModel):
    """Request to stop/cancel ongoing chat."""
    session_id: str
    message_id: Optional[str] = None


class StopChatResponse(BaseModel):
    """Response for stop chat request."""
    success: bool
    message: str
    partial_content: Optional[str] = None


class RegenerateRequest(BaseModel):
    """Request to regenerate a response."""
    session_id: str
    message_id: str
    temperature: Optional[float] = Field(None, ge=0, le=2)
    top_k_config: Optional[TopKConfig] = None


class EditMessageRequest(BaseModel):
    """Request to edit an existing message and regenerate."""
    session_id: str
    message_id: str
    new_content: str
    regenerate: bool = True
    temperature: Optional[float] = Field(None, ge=0, le=2)
    top_k_config: Optional[TopKConfig] = None


# ==================== Chat Prompt Configuration ====================

class ChatPromptConfigBase(BaseModel):
    """Base chat prompt config schema."""
    name: str = "Default RAG Prompt"
    system_prompt: Optional[str] = None
    no_data_response: Optional[str] = None
    file_relevance_format: Optional[str] = None
    include_file_relevance: bool = True
    max_context_chunks: int = 5
    min_relevance_threshold: float = 0.1


class ChatPromptConfigCreate(ChatPromptConfigBase):
    """Create chat prompt config."""
    project_id: Optional[str] = None


class ChatPromptConfigUpdate(BaseModel):
    """Update chat prompt config."""
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    no_data_response: Optional[str] = None
    file_relevance_format: Optional[str] = None
    include_file_relevance: Optional[bool] = None
    max_context_chunks: Optional[int] = None
    min_relevance_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class ChatPromptConfigResponse(BaseModel):
    """Chat prompt config response."""
    id: str
    project_id: Optional[str]
    name: str
    system_prompt: str
    no_data_response: str
    file_relevance_format: str
    include_file_relevance: bool
    max_context_chunks: int
    min_relevance_threshold: float
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatPromptConfigList(BaseModel):
    """List of chat prompt configs."""
    configs: List[ChatPromptConfigResponse]
    total: int


# ==================== Chat Session ====================

class ChatSessionCreate(BaseModel):
    """Create chat session request."""
    project_id: Optional[str] = None
    name: str = "New Chat"


class ChatSessionSettingsUpdate(BaseModel):
    """Update chat session settings."""
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0, le=2)
    max_tokens: Optional[int] = Field(None, ge=1)
    enable_rag: Optional[bool] = None
    top_k_config: Optional[TopKConfig] = None
    include_history: Optional[bool] = None
    system_prompt: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Chat session response."""
    id: str
    project_id: Optional[str]
    name: str
    session_settings: Optional[Dict[str, Any]] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionListResponse(BaseModel):
    """List of chat sessions."""
    sessions: List[ChatSessionResponse]
    total: int


class ChatHistoryMessage(BaseModel):
    """Chat history message."""
    id: str
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Chat history response."""
    session_id: str
    messages: List[ChatHistoryMessage]
    total: int
