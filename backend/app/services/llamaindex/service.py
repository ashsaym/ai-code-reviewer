"""
LlamaIndex service for AI operations.

Provides:
- LLM integration (OpenAI-compatible API via llama-index-llms-openai)
- Embedding generation (via llama-index-embeddings-openai with model_name for custom models)
- Vector store operations (via llama-index-vector-stores-milvus)
- Redis storage (via llama-index-storage-*-redis)
"""
import logging
from typing import List, Optional, Dict, Any

from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    Settings as LlamaSettings,
)
from llama_index.core.schema import Document, TextNode
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.storage.kvstore.redis import RedisKVStore
from llama_index.storage.docstore.redis import RedisDocumentStore
from llama_index.storage.index_store.redis import RedisIndexStore

from app.config import settings

logger = logging.getLogger(__name__)


class LlamaIndexService:
    """
    LlamaIndex-based service for AI operations.
    
    Uses OpenAI-compatible APIs (like Open WebUI) for LLM and embeddings.
    Uses PGVector (PostgreSQL, default) or Milvus for vector storage based on USE_MILVUS setting.
    Uses Redis for document/index storage.
    
    Can be initialized with custom OpenWebUI config or use defaults from settings.
    """
    
    def __init__(self, 
                 api_url: Optional[str] = None,
                 api_key: Optional[str] = None,
                 chat_model: Optional[str] = None,
                 embedding_model: Optional[str] = None,
                 chat_context_size: Optional[int] = None,
                 embedding_dimension: Optional[int] = None,
                 temperature: Optional[float] = None,
                 max_tokens: Optional[int] = None):
        """
        Initialize LlamaIndex service.
        
        Args:
            api_url: OpenWebUI API URL (defaults to settings.OPENWEB_API_URL)
            api_key: OpenWebUI API key (defaults to settings.OPENWEB_API_KEY)
            chat_model: Chat model name (defaults to settings.OPENWEB_CHAT_MODEL)
            embedding_model: Embedding model name (defaults to settings.OPENWEB_EMBEDDER_MODEL)
            chat_context_size: Chat context size (defaults to settings.OPENWEB_CHAT_CONTEXT_SIZE)
            embedding_dimension: Embedding dimension (defaults to settings.EMBEDDING_DIMENSION)
            temperature: Default temperature (defaults to settings.DEFAULT_TEMPERATURE)
            max_tokens: Default max tokens (defaults to settings.DEFAULT_MAX_TOKENS)
        """
        self._api_url = api_url or settings.OPENWEB_API_URL
        self._api_key = api_key or settings.OPENWEB_API_KEY
        self._chat_model = chat_model or settings.OPENWEB_CHAT_MODEL
        self._embedding_model = embedding_model or settings.OPENWEB_EMBEDDER_MODEL
        self._chat_context_size = chat_context_size or settings.OPENWEB_CHAT_CONTEXT_SIZE
        self._embedding_dimension = embedding_dimension or settings.EMBEDDING_DIMENSION
        self._temperature = temperature or settings.DEFAULT_TEMPERATURE
        self._max_tokens = max_tokens or settings.DEFAULT_MAX_TOKENS
        
        self._llm: Optional[OpenAI] = None
        self._embed_model: Optional[OpenAIEmbedding] = None
        self._initialized = False
    
    def _get_api_base(self) -> str:
        """
        Get API base URL for OpenWebUI.
        
        OPENWEB_API_URL contains the complete base path (e.g., http://host:port/api/v1).
        The OpenAI client will append /chat/completions to this base.
        So the final URL will be: OPENWEB_API_URL + /chat/completions
        
        Example: http://192.168.50.100:8081/api/v1 + /chat/completions
                = http://192.168.50.100:8081/api/v1/chat/completions
        """
        return self._api_url
    
    def initialize(self):
        """Initialize LlamaIndex components."""
        if self._initialized:
            return
        
        logger.info(f"🔧 Initializing LlamaIndex service with model {self._chat_model}...")
        
        api_base = self._get_api_base()
        api_key = self._api_key
        
        if not api_key:
            logger.warning("⚠️ OPENWEB_API_KEY not set - AI features disabled")
            return
        
        try:
            import httpx
            from app.utils.ssl_config import get_ssl_context
            
            # Create httpx client with SSL configuration
            ssl_verify = get_ssl_context()
            http_client = httpx.Client(verify=ssl_verify, timeout=480.0)
            
            # Register custom model with LlamaIndex to bypass validation
            from llama_index.llms.openai.utils import ALL_AVAILABLE_MODELS, CHAT_MODELS
            ALL_AVAILABLE_MODELS[self._chat_model] = self._chat_context_size
            CHAT_MODELS[self._chat_model] = True  # Mark as chat model to use /chat/completions endpoint
            logger.info(f"✅ Registered custom model: {self._chat_model}")
            
            # Initialize LLM for OpenAI-compatible API (OpenWebUI)
            # Use default_model_name to avoid tokenizer lookup for custom models
            # Pass custom httpx client for SSL support
            self._llm = OpenAI(
                model=self._chat_model,
                api_base=api_base,
                api_key=api_key,
                temperature=self._temperature,
                max_tokens=self._max_tokens,
                default_headers={"HTTP-Referer": "https://github.com/ashsaym/InfraMind-AI"},
                timeout=480.0,  # 8 minutes timeout for LLM requests (4x increase)
                http_client=http_client,  # Use custom httpx client with SSL config
            )
            
            # Initialize Embedding Model
            # Use model_name parameter instead of model to bypass the built-in 
            # OpenAI model validation. This allows using custom models from
            # OpenAI-compatible APIs like Open WebUI (e.g., models/Qwen3-Embedding.gguf)
            # Pass custom httpx client for SSL support
            self._embed_model = OpenAIEmbedding(
                model_name=self._embedding_model,
                api_base=api_base,
                api_key=api_key,
                embed_batch_size=settings.DEFAULT_BATCH_SIZE,
                timeout=240.0,  # 4 minutes timeout for embedding requests (4x increase)
                http_client=http_client,  # Use custom httpx client with SSL config
            )
            
            # Set global defaults
            LlamaSettings.llm = self._llm
            LlamaSettings.embed_model = self._embed_model
            LlamaSettings.chunk_size = settings.MAX_CHUNK_SIZE
            LlamaSettings.chunk_overlap = settings.CHUNK_OVERLAP
            
            self._initialized = True
            logger.info("✅ LlamaIndex service initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize LlamaIndex: {e}")
            raise
    
    @property
    def llm(self) -> OpenAI:
        """Get LLM instance."""
        if not self._initialized:
            self.initialize()
        if not self._llm:
            raise RuntimeError("LLM not available - check OPENWEB_API_KEY")
        return self._llm
    
    @property
    def embed_model(self) -> OpenAIEmbedding:
        """Get embedding model instance."""
        if not self._initialized:
            self.initialize()
        if not self._embed_model:
            raise RuntimeError("Embedding model not available - check OPENWEB_API_KEY")
        return self._embed_model
    
    async def get_model_context_size(self) -> int:
        """Get the actual context size from OpenWebUI API dynamically."""
        try:
            import httpx
            from app.utils.ssl_config import get_ssl_context
            
            # Try to fetch model info from OpenWebUI API
            async with httpx.AsyncClient(timeout=10.0, verify=get_ssl_context()) as client:
                # OpenWebUI models endpoint
                models_url = self._api_url.replace('/api/v1', '/api/models')
                
                response = await client.get(
                    models_url,
                    headers={"Authorization": f"Bearer {self._api_key}"}
                )
                
                if response.status_code == 200:
                    models_data = response.json()
                    
                    # Look for the current model in the response
                    if isinstance(models_data, dict) and 'data' in models_data:
                        for model in models_data['data']:
                            if model.get('id') == self._chat_model or model.get('model') == self._chat_model:
                                # Try different possible fields for context size
                                context_size = (
                                    model.get('context_length') or
                                    model.get('context_size') or
                                    model.get('max_tokens') or
                                    model.get('n_ctx')
                                )
                                if context_size:
                                    logger.info(f"📊 Fetched dynamic context size for {self._chat_model}: {context_size}")
                                    return int(context_size)
                    
                    # If model list format is different
                    elif isinstance(models_data, list):
                        for model in models_data:
                            if model.get('id') == self._chat_model or model.get('model') == self._chat_model:
                                context_size = (
                                    model.get('context_length') or
                                    model.get('context_size') or
                                    model.get('max_tokens') or
                                    model.get('n_ctx')
                                )
                                if context_size:
                                    logger.info(f"📊 Fetched dynamic context size for {self._chat_model}: {context_size}")
                                    return int(context_size)
                
                logger.warning(f"⚠️ Could not fetch context size from OpenWebUI API, using configured value: {self._chat_context_size}")
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch dynamic context size: {e}, using configured value: {self._chat_context_size}")
        
        # Fallback to configured value
        return self._chat_context_size
    
    def get_vector_store(
        self, 
        collection_name: str,
        dim: Optional[int] = None
    ):
        """Get vector store (PGVector or Milvus) based on USE_MILVUS setting."""
        if settings.USE_MILVUS:
            logger.info(f"Using Milvus vector store for collection '{collection_name}'")
            return MilvusVectorStore(
                uri=settings.milvus_uri,
                collection_name=collection_name,
                dim=dim or settings.EMBEDDING_DIMENSION,
                overwrite=False,
            )
        else:
            logger.info(f"Using PGVector (PostgreSQL) vector store for table '{collection_name}'")
            return PGVectorStore.from_params(
                database=settings.POSTGRES_DB,
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                table_name=collection_name,
                embed_dim=dim or settings.EMBEDDING_DIMENSION,
            )
    
    def get_milvus_vector_store(
        self, 
        collection_name: str,
        dim: Optional[int] = None
    ) -> MilvusVectorStore:
        """Get Milvus vector store for a collection. (Deprecated: use get_vector_store)"""
        return MilvusVectorStore(
            uri=settings.milvus_uri,
            collection_name=collection_name,
            dim=dim or settings.EMBEDDING_DIMENSION,
            overwrite=False,
        )
    
    def get_redis_storage_context(self, namespace: str) -> StorageContext:
        """Get Redis-backed storage context for persistent storage."""
        redis_url = settings.redis_url
        
        kvstore = RedisKVStore(
            redis_url=redis_url,
            namespace=namespace,
        )
        
        docstore = RedisDocumentStore(
            redis_kvstore=kvstore,
            namespace=f"{namespace}_docs",
        )
        
        index_store = RedisIndexStore(
            redis_kvstore=kvstore,
            namespace=f"{namespace}_index",
        )
        
        return StorageContext.from_defaults(
            docstore=docstore,
            index_store=index_store,
        )
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not self._initialized:
            self.initialize()
        
        try:
            embedding = await self.embed_model.aget_text_embedding(text)
            return embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str]
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not self._initialized:
            self.initialize()
        
        try:
            embeddings = await self.embed_model.aget_text_embedding_batch(texts)
            return embeddings
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            raise
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate chat completion."""
        if not self._initialized:
            self.initialize()
        
        try:
            from llama_index.core.llms import ChatMessage, MessageRole
            
            chat_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "system":
                    chat_messages.append(ChatMessage(role=MessageRole.SYSTEM, content=content))
                elif role == "assistant":
                    chat_messages.append(ChatMessage(role=MessageRole.ASSISTANT, content=content))
                else:
                    chat_messages.append(ChatMessage(role=MessageRole.USER, content=content))
            
            # Use the initialized LLM (already configured correctly)
            llm = self.llm
            # Note: We don't create temp LLM instances because they need model registration
            # The default LLM settings are sufficient for most use cases
            
            response = await llm.achat(chat_messages)
            content = response.message.content
            return content
            
        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            raise
    
    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        """
        Generate streaming chat completion with reasoning support.
        
        Yields tuples of (content_delta, reasoning_delta, usage_dict) where either delta can be empty string.
        usage_dict contains: {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int}
        Usage info is only present in the final chunk.
        """
        if not self._initialized:
            self.initialize()
        
        try:
            from llama_index.core.llms import ChatMessage, MessageRole
            
            chat_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "system":
                    chat_messages.append(ChatMessage(role=MessageRole.SYSTEM, content=content))
                elif role == "assistant":
                    chat_messages.append(ChatMessage(role=MessageRole.ASSISTANT, content=content))
                else:
                    chat_messages.append(ChatMessage(role=MessageRole.USER, content=content))
            
            # Use the initialized LLM (already configured correctly)
            llm = self.llm
            # Note: We don't create temp LLM instances because they need model registration
            
            async for chunk in await llm.astream_chat(chat_messages):
                content_delta = chunk.delta or ""
                reasoning_delta = ""
                usage = None
                
                # Extract reasoning and usage from raw response if available
                if hasattr(chunk, 'raw') and chunk.raw:
                    try:
                        # OpenAI API format: choices[0].delta.reasoning_content
                        if hasattr(chunk.raw, 'choices') and len(chunk.raw.choices) > 0:
                            delta_obj = chunk.raw.choices[0].delta
                            if hasattr(delta_obj, 'reasoning_content') and delta_obj.reasoning_content:
                                reasoning_delta = delta_obj.reasoning_content
                        
                        # Extract token usage (usually in final chunk)
                        if hasattr(chunk.raw, 'usage') and chunk.raw.usage:
                            usage_obj = chunk.raw.usage
                            usage = {
                                "prompt_tokens": getattr(usage_obj, 'prompt_tokens', 0),
                                "completion_tokens": getattr(usage_obj, 'completion_tokens', 0),
                                "total_tokens": getattr(usage_obj, 'total_tokens', 0)
                            }
                    except Exception as e:
                        logger.debug(f"Failed to extract reasoning/usage: {e}")
                
                # Yield tuple of (content, reasoning, usage)
                yield (content_delta, reasoning_delta, usage)
                
        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            raise
    
    def create_vector_index(
        self,
        collection_name: str,
        nodes: Optional[List[TextNode]] = None,
    ) -> VectorStoreIndex:
        """Create or load a vector store index."""
        if not self._initialized:
            self.initialize()
        
        vector_store = self.get_vector_store(collection_name)
        
        if nodes:
            # Create new index with nodes
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            index = VectorStoreIndex(
                nodes=nodes,
                storage_context=storage_context,
                embed_model=self.embed_model,
            )
        else:
            # Load existing index
            index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
                embed_model=self.embed_model,
            )
        
        return index
    
    async def query_index(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Query a vector index and return results."""
        if not self._initialized:
            self.initialize()
        
        try:
            import asyncio
            
            logger.info(f"🔍 Querying index '{collection_name}' with top_k={top_k}...")
            start_time = asyncio.get_event_loop().time()
            
            index = self.create_vector_index(collection_name)
            retriever = index.as_retriever(similarity_top_k=top_k)
            
            # Add timeout for large retrievals (scale with top_k)
            # Base timeout: 90s + 1.5s per result (3x increase)
            timeout_seconds = min(90 + (top_k * 1.5), 480)  # Max 8 minutes (4x increase)
            logger.info(f"⏱️ Using timeout of {timeout_seconds}s for retrieval")
            
            try:
                nodes = await asyncio.wait_for(
                    retriever.aretrieve(query),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.error(f"⏱️ Retrieval timed out after {timeout_seconds}s with top_k={top_k}")
                raise TimeoutError(f"Vector search timed out after {timeout_seconds}s. Try reducing top_k value.")
            
            elapsed = asyncio.get_event_loop().time() - start_time
            logger.info(f"✅ Retrieved {len(nodes)} nodes in {elapsed:.2f}s")
            
            results = []
            for node in nodes:
                results.append({
                    "text": node.text,
                    "score": node.score,
                    "metadata": node.metadata,
                    "node_id": node.node_id,
                })
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Index query failed: {e}")
            raise


# Global service instance (uses default settings)
llamaindex_service = LlamaIndexService()


async def get_llamaindex_service_for_project(
    db_session,
    project_id: Optional[str] = None
) -> LlamaIndexService:
    """
    Get LlamaIndex service configured for a specific project.
    
    If project has an OpenWebUI config, use that.
    Otherwise, fall back to default config or global service.
    
    Args:
        db_session: Database session
        project_id: Project UUID (optional)
    
    Returns:
        LlamaIndexService instance configured for the project
    """
    from sqlalchemy import select
    from app.db.models import Project, OpenWebUIConfig
    from uuid import UUID
    
    # If no project, use default service
    if not project_id:
        return llamaindex_service
    
    try:
        # Get project
        result = await db_session.execute(
            select(Project).where(Project.id == UUID(project_id))
        )
        project = result.scalar_one_or_none()
        
        if not project or not project.openwebui_config_id:
            # Use default service
            return llamaindex_service
        
        # Get project's OpenWebUI config
        config_result = await db_session.execute(
            select(OpenWebUIConfig).where(OpenWebUIConfig.id == project.openwebui_config_id)
        )
        config = config_result.scalar_one_or_none()
        
        if not config:
            # Config not found, use default
            return llamaindex_service
        
        # Create custom service instance
        service = LlamaIndexService(
            api_url=config.api_url,
            api_key=config.api_key,
            chat_model=config.default_chat_model,
            embedding_model=config.default_embedding_model,
            chat_context_size=config.chat_context_size,
            embedding_dimension=config.embedding_dimension,
            temperature=config.default_temperature,
            max_tokens=config.default_max_tokens
        )
        service.initialize()
        
        logger.info(f"✅ Created custom LlamaIndex service for project {project_id} using config '{config.name}'")
        return service
        
    except Exception as e:
        logger.error(f"Failed to create project-specific service: {e}")
        # Fall back to default
        return llamaindex_service
