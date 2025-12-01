"""
Chat API endpoints.

Provides:
- Direct chat completion (using LlamaIndex LLM)
- Embedding generation
- Project chat with RAG (always context-driven)
- Chat session management with history
- Chat prompt configuration with editing and reset
- File relevance display with percentages
- Stop/cancel chat, regenerate, edit messages
- Dynamic top_k configuration
"""
import logging
import asyncio
import uuid
from typing import Optional, List, Dict, Any, Set
from uuid import UUID
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, attributes

from app.db.session import get_db
from app.db.models import (
    Project, ChatSession, ChatMessage, 
    ChatPromptConfig, SourceFile, DocumentChunk
)
from app.config import settings
from app.services.llamaindex.service import llamaindex_service
from app.schemas.chat import (
    ChatRequest, ChatResponse,
    EmbeddingRequest, EmbeddingBatchRequest, EmbeddingResponse, EmbeddingBatchResponse,
    ProjectChatRequest, ProjectChatResponse, RetrievedContext, FileRelevance, FileContentResponse,
    ChatSessionCreate, ChatSessionResponse, ChatSessionListResponse, ChatSessionSettingsUpdate,
    ChatHistoryMessage, ChatHistoryResponse,
    ChatPromptConfigCreate, ChatPromptConfigUpdate, ChatPromptConfigResponse, ChatPromptConfigList,
    TopKConfig, StopChatRequest, StopChatResponse, RegenerateRequest, EditMessageRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Track active streaming chats for cancellation (asyncio-safe, single-threaded event loop)
_active_streams: Dict[str, asyncio.Event] = {}
_streams_lock = asyncio.Lock()


async def get_stop_event(message_id: str) -> asyncio.Event:
    """Get or create stop event for a message (thread-safe)."""
    async with _streams_lock:
        if message_id not in _active_streams:
            _active_streams[message_id] = asyncio.Event()
        return _active_streams[message_id]


async def cleanup_stop_event(message_id: str):
    """Cleanup stop event after chat completes (thread-safe)."""
    async with _streams_lock:
        _active_streams.pop(message_id, None)


# Default prompts for reset functionality
DEFAULT_SYSTEM_PROMPT = """You are an AI coding assistant helping with the project "{project_name}".

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
- If you're unsure, say so rather than guessing"""

DEFAULT_NO_DATA_RESPONSE = """I couldn't find any relevant data in the indexed codebase for project "{project_name}".

This could be because:
1. No files have been synced and processed yet
2. No embeddings have been generated
3. The question is unrelated to the codebase content

Please ensure files are synced, processed, and embedded before asking questions about the code."""

DEFAULT_FILE_RELEVANCE_FORMAT = "{file_path}: {relevance_percent}% relevant\nSnippet: {snippet}"


async def get_or_create_prompt_config(
    db: AsyncSession, 
    project_id: Optional[UUID] = None
) -> ChatPromptConfig:
    """Get prompt config for project, or create default."""
    # Try to get project-specific config
    if project_id:
        result = await db.execute(
            select(ChatPromptConfig)
            .where(ChatPromptConfig.project_id == project_id)
            .where(ChatPromptConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        if config:
            return config
    
    # Try to get default config
    result = await db.execute(
        select(ChatPromptConfig)
        .where(ChatPromptConfig.is_default == True)
        .where(ChatPromptConfig.is_active == True)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config
        config = ChatPromptConfig(
            name="Default RAG Prompt",
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            no_data_response=DEFAULT_NO_DATA_RESPONSE,
            file_relevance_format=DEFAULT_FILE_RELEVANCE_FORMAT,
            is_default=True,
            is_active=True
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
        logger.info("Created default chat prompt config")
    
    return config


async def calculate_dynamic_top_k(
    db: AsyncSession,
    project_id: UUID,
    top_k_config: Optional[TopKConfig] = None,
    legacy_top_k: Optional[int] = None
) -> tuple[int, int]:
    """
    Calculate the optimal top_k value based on configuration and indexed data.
    
    Returns: (top_k_value, total_chunks)
    """
    # Get total indexed chunks for the project
    from app.db.models import Source
    
    total_chunks_result = await db.execute(
        select(func.count(DocumentChunk.id))
        .join(SourceFile)
        .join(Source)
        .where(Source.project_id == project_id)
        .where(DocumentChunk.has_embedding == True)
    )
    total_chunks = total_chunks_result.scalar() or 0
    
    # If legacy top_k is provided, use it
    if legacy_top_k is not None:
        return min(legacy_top_k, total_chunks) if total_chunks > 0 else legacy_top_k, total_chunks
    
    # If no config, use auto mode with defaults
    if top_k_config is None:
        top_k_config = TopKConfig()
    
    if top_k_config.mode == "manual" and top_k_config.value is not None:
        # Manual mode - use fixed value
        return min(top_k_config.value, total_chunks) if total_chunks > 0 else top_k_config.value, total_chunks
    
    # Auto mode - calculate based on indexed data
    if total_chunks == 0:
        return top_k_config.auto_min, 0
    
    # Calculate optimal top_k as percentage of total, within bounds
    calculated = int(total_chunks * top_k_config.auto_percent)
    optimal = max(top_k_config.auto_min, min(calculated, top_k_config.auto_max))
    
    # Never retrieve more than total chunks
    return min(optimal, total_chunks), total_chunks


def calculate_file_relevance(
    contexts: List[Dict[str, Any]],
    min_threshold: float = 0.1
) -> List[FileRelevance]:
    """
    Calculate file relevance from retrieved contexts.
    
    Groups chunks by file and calculates relevance percentage.
    """
    if not contexts:
        return []
    
    # Group by file path
    file_scores: Dict[str, List[float]] = defaultdict(list)
    file_chunks: Dict[str, List[str]] = defaultdict(list)
    file_snippets: Dict[str, str] = {}
    
    for ctx in contexts:
        file_path = ctx.get("file_path", "unknown")
        score = ctx.get("score", 0)
        file_scores[file_path].append(score)
        
        chunk_id = ctx.get("chunk_id")
        if chunk_id:
            file_chunks[file_path].append(chunk_id)
        
        # Keep first snippet for each file
        if file_path not in file_snippets:
            text = ctx.get("text", "")
            file_snippets[file_path] = text[:200] + "..." if len(text) > 200 else text
    
    # Calculate max score across all files for normalization
    all_scores = [s for scores in file_scores.values() for s in scores]
    max_score = max(all_scores) if all_scores else 1.0
    
    # Calculate relevance percentages
    relevances = []
    for file_path, scores in file_scores.items():
        avg_score = sum(scores) / len(scores)
        relevance_percent = (avg_score / max_score) * 100 if max_score > 0 else 0
        
        if relevance_percent >= min_threshold * 100:
            file_name = file_path.split("/")[-1] if "/" in file_path else file_path
            relevances.append(FileRelevance(
                file_path=file_path,
                file_name=file_name,
                relevance_percent=round(relevance_percent, 1),
                chunk_count=len(scores),
                snippet=file_snippets.get(file_path, ""),
                chunk_ids=file_chunks.get(file_path, [])
            ))
    
    # Sort by relevance
    relevances.sort(key=lambda x: x.relevance_percent, reverse=True)
    return relevances


# ==================== AI Chat ====================

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Generate chat completion using LlamaIndex OpenAI LLM.
    
    Uses the configured OpenWebUI API for inference.
    """
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        content = await llamaindex_service.chat_completion(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        return ChatResponse(
            content=content,
            model=settings.OPENWEB_CHAT_MODEL,
            usage=None
        )
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")


@router.post("/chat/stream")
async def chat_completion_stream(request: ChatRequest):
    """
    Generate streaming chat completion with reasoning support.
    
    Returns Server-Sent Events (SSE) stream with JSON messages:
    - {"type": "reasoning", "content": "..."} for thinking/reasoning tokens
    - {"type": "content", "content": "..."} for response content tokens
    """
    async def generate():
        import json
        try:
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            usage_info = None
            
            async for content_delta, reasoning_delta, usage in llamaindex_service.chat_completion_stream(
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                # Send reasoning if present
                if reasoning_delta:
                    yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning_delta})}\n\n"
                
                # Send content if present
                if content_delta:
                    yield f"data: {json.dumps({'type': 'content', 'content': content_delta})}\n\n"
                
                # Store usage info for final stats message
                if usage:
                    usage_info = usage
            
            # Send final token stats
            if usage_info:
                yield f"data: {json.dumps({'type': 'stats', 'usage': usage_info})}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== Embeddings ====================

@router.post("/embed", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """
    Generate embedding for a single text.
    
    Uses LlamaIndex OpenAI embedding model.
    """
    try:
        embedding = await llamaindex_service.generate_embedding(request.text)
        
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=settings.OPENWEB_EMBEDDER_MODEL
        )
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.post("/embed/batch", response_model=EmbeddingBatchResponse)
async def generate_embeddings_batch(request: EmbeddingBatchRequest):
    """
    Generate embeddings for multiple texts.
    """
    try:
        embeddings = await llamaindex_service.generate_embeddings_batch(request.texts)
        
        return EmbeddingBatchResponse(
            embeddings=embeddings,
            count=len(embeddings),
            dimension=len(embeddings[0]) if embeddings else 0,
            model=settings.OPENWEB_EMBEDDER_MODEL
        )
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")


# ==================== Project Chat (RAG) ====================

@router.post("/project")
async def project_chat(
    request: ProjectChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Chat with a project using RAG (Retrieval Augmented Generation).
    
    ALWAYS context-driven:
    1. Calculates optimal top_k (auto or manual mode)
    2. Retrieves relevant context from the project's vector store
    3. If no relevant data found, returns "no data" response
    4. Shows file relevance with percentages
    5. Includes chat history if session_id provided
    6. Supports streaming responses (when stream=True)
    """
    try:
        pid = UUID(request.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Get project
    result = await db.execute(select(Project).where(Project.id == pid))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get prompt configuration
    prompt_config = await get_or_create_prompt_config(db, pid)
    
    # Get or create session
    session_id = request.session_id
    session = None
    
    if session_id:
        try:
            sid = UUID(session_id)
            result = await db.execute(
                select(ChatSession)
                .options(selectinload(ChatSession.messages))
                .where(ChatSession.id == sid)
            )
            session = result.scalar_one_or_none()
        except ValueError:
            pass
    
    if not session:
        session = ChatSession(
            project_id=pid,
            name=f"Chat about {project.name}"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        # Eagerly load messages to avoid lazy loading in async context
        result = await db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == session.id)
        )
        session = result.scalar_one()
    
    # Generate unique message ID for tracking
    message_id = str(uuid.uuid4())
    
    # Calculate dynamic top_k
    top_k, total_indexed_chunks = await calculate_dynamic_top_k(
        db, pid, request.top_k_config, request.top_k
    )
    
    # Check if project has data
    if not project.milvus_collection or total_indexed_chunks == 0:
        # No data - return no data response
        no_data_msg = prompt_config.no_data_response.format(
            project_name=project.name
        )
        
        # Save messages
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.message
        )
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=no_data_msg,
            message_metadata={"no_data": True, "message_id": message_id}
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        
        return ProjectChatResponse(
            content=no_data_msg,
            session_id=str(session.id),
            message_id=message_id,
            has_context=False,
            contexts=[],
            file_relevance=[],
            model=settings.OPENWEB_CHAT_MODEL,
            message="No indexed data found for this project",
            top_k_used=top_k,
            total_indexed_chunks=total_indexed_chunks
        )
    
    # Get project-specific LlamaIndex service
    from app.services.llamaindex.service import get_llamaindex_service_for_project
    project_service = await get_llamaindex_service_for_project(db, str(pid))
    
    # Retrieve context from vector store with calculated top_k
    contexts = []
    context_dicts = []
    
    try:
        results = await project_service.query_index(
            collection_name=project.milvus_collection,
            query=request.message,
            top_k=top_k  # Use calculated top_k
        )
        
        for r in results:
            score = r.get("score", 0)
            
            # Filter by minimum relevance
            if score < request.min_relevance:
                continue
            
            file_path = r.get("metadata", {}).get("file_path", "unknown")
            file_name = file_path.split("/")[-1] if "/" in file_path else file_path
            text = r["text"]
            
            contexts.append(RetrievedContext(
                text=text,
                score=score,
                file_path=file_path,
                file_name=file_name,
                chunk_index=r.get("metadata", {}).get("chunk_index"),
                chunk_id=r.get("node_id"),
                token_count=len(text.split())  # Rough token estimate
            ))
            
            context_dicts.append({
                "text": text,
                "score": score,
                "file_path": file_path,
                "chunk_id": r.get("node_id")
            })
            
    except Exception as e:
        logger.warning(f"Context retrieval failed: {e}")
    
    # Check if we have any relevant context
    if not contexts:
        # No relevant data found
        no_data_msg = prompt_config.no_data_response.format(
            project_name=project.name
        )
        
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.message
        )
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=no_data_msg,
            message_metadata={"no_data": True, "query": request.message, "message_id": message_id}
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        
        return ProjectChatResponse(
            content=no_data_msg,
            session_id=str(session.id),
            message_id=message_id,
            has_context=False,
            contexts=[],
            file_relevance=[],
            model=settings.OPENWEB_CHAT_MODEL,
            message="No relevant data found for this query",
            top_k_used=top_k,
            total_indexed_chunks=total_indexed_chunks
        )
    
    # Calculate file relevance
    file_relevance = calculate_file_relevance(
        context_dicts,
        min_threshold=request.min_relevance
    )
    
    # Build file info string
    # When auto mode, include ALL files; when manual, limit to top_k value
    file_limit = None  # No limit for auto mode
    if request.top_k_config and request.top_k_config.mode == "manual" and request.top_k_config.value:
        file_limit = request.top_k_config.value
    
    file_info_parts = []
    file_list = []
    files_to_include = file_relevance if file_limit is None else file_relevance[:file_limit]
    for fr in files_to_include:
        file_list.append(fr.file_path)
        if prompt_config.include_file_relevance:
            file_info_parts.append(
                prompt_config.file_relevance_format.format(
                    file_path=fr.file_path,
                    relevance_percent=fr.relevance_percent,
                    snippet=fr.snippet[:100]  # Truncate snippets
                )
            )
    
    file_info = "\n\n".join(file_info_parts) if file_info_parts else "No specific file information"
    file_list_str = ", ".join(file_list) if file_list else "No files"
    
    # Build context string - optimize to avoid redundant tokens
    import hashlib
    seen_texts = set()
    unique_contexts = []
    for c in contexts:
        # Use deterministic hash for deduplication
        text_hash = hashlib.md5(c.text[:100].encode()).hexdigest()
        if text_hash not in seen_texts:
            seen_texts.add(text_hash)
            unique_contexts.append(c.text)
    
    context_text = "\n\n---\n\n".join(unique_contexts)
    
    # Build system prompt
    system_prompt = prompt_config.system_prompt.format(
        project_name=project.name,
        context=context_text,
        file_info=file_info,
        file_list=file_list_str
    )
    
    # Build messages with history
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add chat history - limit to save tokens
    if request.include_history and session.messages:
        history = sorted(session.messages, key=lambda m: m.created_at)[-settings.CHAT_HISTORY_MAX_MESSAGES:]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
    
    # Add current message
    messages.append({"role": "user", "content": request.message})
    
    # Estimate tokens (rough approximation: ~1.3 tokens per word)
    total_tokens = int(sum(len(m["content"].split()) for m in messages) * 1.3)
    
    # Handle streaming vs non-streaming
    if request.stream:
        # Return streaming response
        async def generate_stream():
            import json
            
            try:
                # Send thinking/sources first
                yield f"data: {json.dumps({'type': 'thinking', 'content': f'Analyzing {len(contexts)} relevant code chunks...'})}\n\n"
                yield f"data: {json.dumps({'type': 'file_relevance', 'file_relevance': [{'file_path': fr.file_path, 'file_name': fr.file_name, 'relevance_percent': fr.relevance_percent} for fr in file_relevance]})}\n\n"
                
                # Stream the response with reasoning
                full_content = ""
                full_reasoning = ""
                usage_info = None
                async for content_delta, reasoning_delta, usage in project_service.chat_completion_stream(
                    messages=messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                ):
                    # Send reasoning if present
                    if reasoning_delta:
                        full_reasoning += reasoning_delta
                        yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning_delta})}\n\n"
                    
                    # Send content if present
                    if content_delta:
                        full_content += content_delta
                        yield f"data: {json.dumps({'type': 'content', 'content': content_delta})}\n\n"
                    
                    # Store usage info for final stats
                    if usage:
                        usage_info = usage
                
                # Save messages to database
                user_msg = ChatMessage(
                    session_id=session.id,
                    role="user",
                    content=request.message,
                    message_metadata={
                        "contexts_retrieved": len(contexts),
                        "files_relevant": len(file_relevance),
                        "message_id": message_id
                    }
                )
                # Prepare metadata with token stats
                metadata = {
                    "model": settings.OPENWEB_CHAT_MODEL,
                    "message_id": message_id,
                    "top_k_used": top_k,
                    "tokens_used": total_tokens,
                    "reasoning": full_reasoning or f"Analyzed {len(contexts)} relevant code chunks from {len(file_relevance)} files",
                    "file_relevance": [
                        {"file": fr.file_path, "percent": fr.relevance_percent}
                        for fr in file_relevance
                    ]
                }
                
                # Add detailed token usage if available
                if usage_info:
                    metadata.update({
                        "prompt_tokens": usage_info["prompt_tokens"],
                        "completion_tokens": usage_info["completion_tokens"],
                        "total_tokens_precise": usage_info["total_tokens"]
                    })
                
                assistant_msg = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=format_code_response(full_content),
                    message_metadata=metadata
                )
                
                db.add(user_msg)
                db.add(assistant_msg)
                await db.commit()
                
                # Send final token stats
                if usage_info:
                    yield f"data: {json.dumps({'type': 'stats', 'usage': usage_info})}\n\n"
                
                yield f"data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Streaming failed: {e}")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    
    # Non-streaming response
    try:
        response_content = await project_service.chat_completion(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")
    
    # Format code blocks in response for UI
    response_content = format_code_response(response_content)
    
    # Save messages to session
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=request.message,
        message_metadata={
            "contexts_retrieved": len(contexts),
            "files_relevant": len(file_relevance),
            "message_id": message_id
        }
    )
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=response_content,
        message_metadata={
            "model": settings.OPENWEB_CHAT_MODEL,
            "message_id": message_id,
            "top_k_used": top_k,
            "tokens_used": total_tokens,
            "reasoning": f"Analyzed {len(contexts)} relevant code chunks from {len(file_relevance)} files",
            "file_relevance": [
                {"file": fr.file_path, "percent": fr.relevance_percent}
                for fr in file_relevance
            ]
        }
    )
    
    db.add(user_msg)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    
    return ProjectChatResponse(
        content=response_content,
        session_id=str(session.id),
        message_id=str(assistant_msg.id),
        has_context=True,
        contexts=contexts,
        file_relevance=file_relevance,
        model=settings.OPENWEB_CHAT_MODEL,
        top_k_used=top_k,
        total_indexed_chunks=total_indexed_chunks,
        tokens_used=total_tokens
    )


def format_code_response(content: str) -> str:
    """
    Format code blocks in response for proper UI rendering.
    Detects code patterns and wraps them in markdown code blocks.
    """
    import re
    
    # Already formatted code blocks - return as-is
    if "```" in content:
        return content
    
    # Common code patterns to detect and format
    code_patterns = [
        # Python patterns
        (r'^(def\s+\w+\s*\([^)]*\)\s*(?:->.*?)?:\s*\n(?:[ \t]+.+\n?)+)', 'python'),
        (r'^(class\s+\w+(?:\([^)]*\))?\s*:\s*\n(?:[ \t]+.+\n?)+)', 'python'),
        (r'^(import\s+\w+(?:\.\w+)*(?:\s*,\s*\w+(?:\.\w+)*)*\s*$)', 'python'),
        (r'^(from\s+\w+(?:\.\w+)*\s+import\s+.+$)', 'python'),
        # JavaScript/TypeScript patterns
        (r'^(function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\})', 'javascript'),
        (r'^(const\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)[\s\S]*?\n\};?)', 'javascript'),
        (r'^(export\s+(?:default\s+)?(?:function|const|class|interface)\s+[\s\S]*?\n\};?)', 'typescript'),
        # Other common patterns
        (r'^(CREATE\s+(?:TABLE|INDEX|VIEW|DATABASE)\s+[\s\S]*?;)', 'sql'),
        (r'^(SELECT\s+[\s\S]*?;)', 'sql'),
    ]
    
    result = content
    for pattern, lang in code_patterns:
        matches = re.finditer(pattern, result, re.MULTILINE)
        for match in matches:
            code_block = match.group(1)
            if code_block.strip():
                formatted = f"\n```{lang}\n{code_block.strip()}\n```\n"
                result = result.replace(code_block, formatted, 1)
    
    return result


# ==================== Chat Controls ====================

@router.post("/stop", response_model=StopChatResponse)
async def stop_chat(request: StopChatRequest):
    """
    Stop/cancel an ongoing chat streaming response.
    """
    message_id = request.message_id
    
    async with _streams_lock:
        if message_id and message_id in _active_streams:
            _active_streams[message_id].set()  # Signal to stop
            return StopChatResponse(
                success=True,
                message="Chat stopped successfully"
            )
    
    return StopChatResponse(
        success=False,
        message="No active chat found with this message ID"
    )


@router.post("/regenerate", response_model=ProjectChatResponse)
async def regenerate_response(
    request: RegenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate a response for an existing message.
    """
    try:
        sid = UUID(request.session_id)
        mid = UUID(request.message_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session or message ID")
    
    # Get the session
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Find the message to regenerate
    msg_result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == mid)
    )
    message = msg_result.scalar_one_or_none()
    
    if not message or message.role != "assistant":
        raise HTTPException(status_code=400, detail="Can only regenerate assistant messages")
    
    # Find the preceding user message
    messages_sorted = sorted(session.messages, key=lambda m: m.created_at)
    user_message = None
    for i, m in enumerate(messages_sorted):
        if m.id == message.id and i > 0:
            user_message = messages_sorted[i-1]
            break
    
    if not user_message or user_message.role != "user":
        raise HTTPException(status_code=400, detail="Could not find preceding user message")
    
    # Delete the old assistant message using proper SQLAlchemy delete
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(ChatMessage).where(ChatMessage.id == message.id))
    await db.commit()
    
    # Create new chat request
    chat_request = ProjectChatRequest(
        project_id=str(session.project_id),
        message=user_message.content,
        session_id=str(session.id),
        include_history=True,
        temperature=request.temperature,
        top_k_config=request.top_k_config
    )
    
    # Generate new response
    return await project_chat(chat_request, db)


@router.post("/edit", response_model=ProjectChatResponse)
async def edit_message(
    request: EditMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Edit an existing user message and optionally regenerate.
    """
    try:
        sid = UUID(request.session_id)
        mid = UUID(request.message_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session or message ID")
    
    # Get the message
    msg_result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == mid)
    )
    message = msg_result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.role != "user":
        raise HTTPException(status_code=400, detail="Can only edit user messages")
    
    # Get session
    session_result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == sid)
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update the message content
    old_content = message.content
    message.content = request.new_content
    message.message_metadata = message.message_metadata or {}
    message.message_metadata["edited"] = True
    message.message_metadata["original_content"] = old_content
    
    # Delete subsequent messages (assistant response and anything after)
    messages_sorted = sorted(session.messages, key=lambda m: m.created_at)
    delete_ids = []
    delete_from = False
    for m in messages_sorted:
        if m.id == message.id:
            delete_from = True
            continue
        if delete_from:
            delete_ids.append(m.id)
    
    # Delete using proper SQLAlchemy delete
    if delete_ids:
        from sqlalchemy import delete as sql_delete
        await db.execute(sql_delete(ChatMessage).where(ChatMessage.id.in_(delete_ids)))
    
    await db.commit()
    
    if not request.regenerate:
        return ProjectChatResponse(
            content="Message edited. Regeneration not requested.",
            session_id=str(session.id),
            message_id=str(message.id),
            has_context=False,
            contexts=[],
            file_relevance=[],
            model=settings.OPENWEB_CHAT_MODEL,
            top_k_used=0,
            total_indexed_chunks=0
        )
    
    # Regenerate response with edited message
    chat_request = ProjectChatRequest(
        project_id=str(session.project_id),
        message=request.new_content,
        session_id=str(session.id),
        include_history=True,
        temperature=request.temperature,
        top_k_config=request.top_k_config
    )
    
    return await project_chat(chat_request, db)


@router.get("/project/{project_id}/file/{file_path:path}", response_model=FileContentResponse)
async def get_file_content(
    project_id: str,
    file_path: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get file content with relevant snippets.
    
    Called when user clicks on a file in chat to see full content.
    """
    try:
        pid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Get project
    result = await db.execute(select(Project).where(Project.id == pid))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Find the source file
    from app.db.models import Source
    
    file_result = await db.execute(
        select(SourceFile)
        .join(Source)
        .where(Source.project_id == pid)
        .where(SourceFile.file_path == file_path)
    )
    source_file = file_result.scalar_one_or_none()
    
    if not source_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get all chunks for this file
    chunks_result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.source_file_id == source_file.id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = list(chunks_result.scalars().all())
    
    # Build full content from chunks
    full_content = "\n".join([c.content for c in chunks]) if chunks else None
    
    # Build snippets
    snippets = [
        {
            "chunk_index": c.chunk_index,
            "content": c.content,
            "has_embedding": c.has_embedding,
            "token_count": c.token_count
        }
        for c in chunks
    ]
    
    return FileContentResponse(
        file_path=source_file.file_path,
        file_name=source_file.file_name,
        full_content=full_content,
        relevant_snippets=snippets,
        total_chunks=len(chunks),
        relevance_percent=0  # Would need context to calculate actual relevance
    )


# ==================== Chat Prompt Configuration ====================

@router.get("/prompts", response_model=ChatPromptConfigList)
async def list_chat_prompts(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List chat prompt configurations."""
    query = select(ChatPromptConfig)
    
    if project_id:
        try:
            pid = UUID(project_id)
            query = query.where(
                (ChatPromptConfig.project_id == pid) | 
                (ChatPromptConfig.is_default == True)
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db.execute(query.order_by(ChatPromptConfig.created_at.desc()))
    configs = list(result.scalars().all())
    
    return ChatPromptConfigList(
        configs=[
            ChatPromptConfigResponse(
                id=str(c.id),
                project_id=str(c.project_id) if c.project_id else None,
                name=c.name,
                system_prompt=c.system_prompt,
                no_data_response=c.no_data_response,
                file_relevance_format=c.file_relevance_format,
                include_file_relevance=c.include_file_relevance,
                max_context_chunks=c.max_context_chunks,
                min_relevance_threshold=c.min_relevance_threshold,
                is_default=c.is_default,
                is_active=c.is_active,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
            for c in configs
        ],
        total=len(configs)
    )


@router.post("/prompts", response_model=ChatPromptConfigResponse, status_code=201)
async def create_chat_prompt(
    data: ChatPromptConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat prompt configuration."""
    pid = None
    if data.project_id:
        try:
            pid = UUID(data.project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    config = ChatPromptConfig(
        project_id=pid,
        name=data.name,
        system_prompt=data.system_prompt or DEFAULT_SYSTEM_PROMPT,
        no_data_response=data.no_data_response or DEFAULT_NO_DATA_RESPONSE,
        file_relevance_format=data.file_relevance_format or DEFAULT_FILE_RELEVANCE_FORMAT,
        include_file_relevance=data.include_file_relevance,
        max_context_chunks=data.max_context_chunks,
        min_relevance_threshold=data.min_relevance_threshold
    )
    
    db.add(config)
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Created chat prompt config: {config.name}")
    
    return ChatPromptConfigResponse(
        id=str(config.id),
        project_id=str(config.project_id) if config.project_id else None,
        name=config.name,
        system_prompt=config.system_prompt,
        no_data_response=config.no_data_response,
        file_relevance_format=config.file_relevance_format,
        include_file_relevance=config.include_file_relevance,
        max_context_chunks=config.max_context_chunks,
        min_relevance_threshold=config.min_relevance_threshold,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.get("/prompts/{prompt_id}", response_model=ChatPromptConfigResponse)
async def get_chat_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a chat prompt configuration by ID."""
    try:
        uid = UUID(prompt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid prompt ID")
    
    result = await db.execute(
        select(ChatPromptConfig).where(ChatPromptConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Prompt config not found")
    
    return ChatPromptConfigResponse(
        id=str(config.id),
        project_id=str(config.project_id) if config.project_id else None,
        name=config.name,
        system_prompt=config.system_prompt,
        no_data_response=config.no_data_response,
        file_relevance_format=config.file_relevance_format,
        include_file_relevance=config.include_file_relevance,
        max_context_chunks=config.max_context_chunks,
        min_relevance_threshold=config.min_relevance_threshold,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/prompts/{prompt_id}", response_model=ChatPromptConfigResponse)
async def update_chat_prompt(
    prompt_id: str,
    data: ChatPromptConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a chat prompt configuration."""
    try:
        uid = UUID(prompt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid prompt ID")
    
    result = await db.execute(
        select(ChatPromptConfig).where(ChatPromptConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Prompt config not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Updated chat prompt config: {config.name}")
    
    return ChatPromptConfigResponse(
        id=str(config.id),
        project_id=str(config.project_id) if config.project_id else None,
        name=config.name,
        system_prompt=config.system_prompt,
        no_data_response=config.no_data_response,
        file_relevance_format=config.file_relevance_format,
        include_file_relevance=config.include_file_relevance,
        max_context_chunks=config.max_context_chunks,
        min_relevance_threshold=config.min_relevance_threshold,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/prompts/{prompt_id}/reset", response_model=ChatPromptConfigResponse)
async def reset_chat_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset a chat prompt configuration to defaults."""
    try:
        uid = UUID(prompt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid prompt ID")
    
    result = await db.execute(
        select(ChatPromptConfig).where(ChatPromptConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Prompt config not found")
    
    # Reset to defaults
    config.system_prompt = DEFAULT_SYSTEM_PROMPT
    config.no_data_response = DEFAULT_NO_DATA_RESPONSE
    config.file_relevance_format = DEFAULT_FILE_RELEVANCE_FORMAT
    config.include_file_relevance = True
    config.max_context_chunks = 5
    config.min_relevance_threshold = 0.1
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Reset chat prompt config to defaults: {config.name}")
    
    return ChatPromptConfigResponse(
        id=str(config.id),
        project_id=str(config.project_id) if config.project_id else None,
        name=config.name,
        system_prompt=config.system_prompt,
        no_data_response=config.no_data_response,
        file_relevance_format=config.file_relevance_format,
        include_file_relevance=config.include_file_relevance,
        max_context_chunks=config.max_context_chunks,
        min_relevance_threshold=config.min_relevance_threshold,
        is_default=config.is_default,
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.delete("/prompts/{prompt_id}")
async def delete_chat_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat prompt configuration."""
    try:
        uid = UUID(prompt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid prompt ID")
    
    result = await db.execute(
        select(ChatPromptConfig).where(ChatPromptConfig.id == uid)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Prompt config not found")
    
    if config.is_default:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the default prompt configuration"
        )
    
    await db.delete(config)
    await db.commit()
    
    return {"success": True, "message": "Prompt configuration deleted"}


# ==================== Chat Sessions ====================

@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List chat sessions."""
    query = select(ChatSession).options(selectinload(ChatSession.messages))
    count_query = select(func.count(ChatSession.id))
    
    if project_id:
        try:
            pid = UUID(project_id)
            query = query.where(ChatSession.project_id == pid)
            count_query = count_query.where(ChatSession.project_id == pid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    result = await db.execute(
        query.order_by(ChatSession.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = list(result.scalars().all())
    
    return ChatSessionListResponse(
        sessions=[
            ChatSessionResponse(
                id=str(s.id),
                project_id=str(s.project_id) if s.project_id else None,
                name=s.name,
                message_count=len(s.messages) if s.messages else 0,
                created_at=s.created_at,
                updated_at=s.updated_at
            )
            for s in sessions
        ],
        total=total
    )


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_chat_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session."""
    pid = None
    if data.project_id:
        try:
            pid = UUID(data.project_id)
            result = await db.execute(select(Project).where(Project.id == pid))
            if not result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Project not found")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID")
    
    session = ChatSession(
        project_id=pid,
        name=data.name
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return ChatSessionResponse(
        id=str(session.id),
        project_id=str(session.project_id) if session.project_id else None,
        name=session.name,
        session_settings=session.session_settings or {},
        message_count=0,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific chat session."""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return ChatSessionResponse(
        id=str(session.id),
        project_id=str(session.project_id) if session.project_id else None,
        name=session.name,
        session_settings=session.session_settings or {},
        message_count=len(session.messages or []),
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.patch("/sessions/{session_id}/settings", response_model=ChatSessionResponse)
async def update_session_settings(
    session_id: str,
    settings: ChatSessionSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update chat session settings (model, temperature, RAG config, etc.)."""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session settings (merge with existing)
    current_settings = session.session_settings or {}
    
    if settings.model is not None:
        current_settings["model"] = settings.model
    if settings.temperature is not None:
        current_settings["temperature"] = settings.temperature
    if settings.max_tokens is not None:
        current_settings["max_tokens"] = settings.max_tokens
    if settings.enable_rag is not None:
        current_settings["enable_rag"] = settings.enable_rag
    if settings.top_k_config is not None:
        current_settings["top_k_config"] = settings.top_k_config.dict()
    if settings.include_history is not None:
        current_settings["include_history"] = settings.include_history
    if settings.system_prompt is not None:
        current_settings["system_prompt"] = settings.system_prompt
    
    session.session_settings = current_settings
    # Mark the JSON column as modified so SQLAlchemy detects the change
    attributes.flag_modified(session, "session_settings")
    
    await db.commit()
    await db.refresh(session)
    
    return ChatSessionResponse(
        id=str(session.id),
        project_id=str(session.project_id) if session.project_id else None,
        name=session.name,
        session_settings=session.session_settings or {},
        message_count=len(session.messages or []),
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get chat history for a session with metadata."""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = sorted(session.messages or [], key=lambda m: m.created_at)
    total = len(messages)
    messages = messages[skip:skip + limit]
    
    return ChatHistoryResponse(
        session_id=str(session.id),
        messages=[
            ChatHistoryMessage(
                id=str(m.id),
                role=m.role,
                content=m.content,
                metadata=m.message_metadata,
                created_at=m.created_at
            )
            for m in messages
        ],
        total=total
    )


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and its history."""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    result = await db.execute(select(ChatSession).where(ChatSession.id == sid))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return {"success": True, "message": "Session deleted"}
