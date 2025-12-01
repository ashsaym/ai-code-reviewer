"""Job executor with parallel chunk processing and exclude pattern support."""
import asyncio
import logging
import hashlib
import fnmatch
import re
from datetime import datetime, timezone
from typing import Dict, Set, Optional, Any, List
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobLog, JobStatus, JobPhase, Source, Project, SourceFile, DocumentChunk, ProcessingConfig, EmbeddingConfig
from app.config import settings

logger = logging.getLogger(__name__)


class ExcludePatternMatcher:
    """Matches files against exclude patterns (supports glob, regex, and path patterns)."""
    
    def __init__(self, exclude_patterns: List[str] = None, exclude_folders: List[str] = None):
        self.exclude_patterns = exclude_patterns or []
        self.exclude_folders = exclude_folders or []
        self._compiled_patterns = []
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile patterns for efficient matching."""
        for pattern in self.exclude_patterns:
            # Handle different pattern types
            if pattern.startswith('/'):
                # Absolute path pattern (from root) - matches from start
                regex = '^' + self._glob_to_regex(pattern[1:])
            elif pattern.startswith('**/'):
                # Match in any directory
                regex = r'(?:^|/)' + self._glob_to_regex(pattern[3:])
            elif '/' in pattern:
                # Path pattern - match the full path
                regex = r'(?:^|/)' + self._glob_to_regex(pattern) + r'(?:/|$)'
            else:
                # Simple filename pattern - match anywhere in path as filename
                # e.g., "*.py" matches any .py file, "*-lock.json" matches any -lock.json
                regex = r'(?:^|/)' + self._glob_to_regex(pattern) + r'$'
            
            try:
                self._compiled_patterns.append(re.compile(regex))
            except re.error:
                logger.warning(f"Invalid exclude pattern: {pattern}")
    
    def _glob_to_regex(self, pattern: str) -> str:
        """Convert glob pattern to regex."""
        # Escape special regex chars except glob wildcards
        result = ""
        i = 0
        while i < len(pattern):
            c = pattern[i]
            if c == '*':
                if i + 1 < len(pattern) and pattern[i + 1] == '*':
                    result += '.*'
                    i += 1
                else:
                    result += '[^/]*'
            elif c == '?':
                result += '[^/]'
            elif c in '.^$+{}[]|()\\':
                result += '\\' + c
            else:
                result += c
            i += 1
        return result
    
    def should_exclude(self, file_path: str) -> bool:
        """Check if a file should be excluded."""
        # Check folder exclusions first
        for folder in self.exclude_folders:
            folder = folder.strip('/')
            if f'/{folder}/' in f'/{file_path}/' or file_path.startswith(f'{folder}/'):
                return True
        
        # Check compiled patterns (these are already comprehensive)
        for compiled in self._compiled_patterns:
            if compiled.search(file_path):
                return True
        
        return False


class JobExecutor:
    def __init__(self):
        self._running_jobs: Dict[str, asyncio.Task] = {}
        self._paused_jobs: Set[str] = set()
        self._cancelled_jobs: Set[str] = set()
        self._lock = asyncio.Lock()

    async def _get_session(self) -> AsyncSession:
        return AsyncSessionLocal()

    async def _log_job(self, db: AsyncSession, job_id: UUID, level: str, message: str, details: Optional[Dict[str, Any]] = None):
        log = JobLog(job_id=job_id, level=level, message=message, details=details)
        db.add(log)
        await db.commit()
        if level == "error": logger.error(f"Job {job_id}: {message}")

    async def _update_job_status(self, db: AsyncSession, job_id: UUID, status: JobStatus, phase: Optional[JobPhase] = None, error_message: Optional[str] = None, checkpoint: Optional[Dict[str, Any]] = None):
        update_data = {"status": status.value}
        if phase: update_data["phase"] = phase.value
        if status == JobStatus.RUNNING: update_data["started_at"] = datetime.now(timezone.utc)
        elif status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED): update_data["completed_at"] = datetime.now(timezone.utc)
        if error_message: update_data["error_message"] = error_message
        if checkpoint: update_data["checkpoint"] = checkpoint
        await db.execute(update(Job).where(Job.id == job_id).values(**update_data))
        await db.commit()

    async def _update_progress(self, db: AsyncSession, job_id: UUID, total_items: int = 0, processed_items: int = 0, failed_items: int = 0, current_item: Optional[str] = None):
        progress = (processed_items / total_items * 100) if total_items > 0 else 0
        await db.execute(update(Job).where(Job.id == job_id).values(total_items=total_items, processed_items=processed_items, failed_items=failed_items, progress_percent=progress, current_item=current_item))
        await db.commit()

    def is_job_paused(self, job_id: str) -> bool: return job_id in self._paused_jobs
    def is_job_cancelled(self, job_id: str) -> bool: return job_id in self._cancelled_jobs
    def pause_job(self, job_id: str): self._paused_jobs.add(job_id)
    def resume_job(self, job_id: str): self._paused_jobs.discard(job_id)
    def cancel_job(self, job_id: str):
        self._cancelled_jobs.add(job_id)
        if job_id in self._running_jobs and not self._running_jobs[job_id].done(): self._running_jobs[job_id].cancel()

    async def execute_job(self, job_id: str):
        async with self._lock:
            if job_id in self._running_jobs and not self._running_jobs[job_id].done(): return
        task = asyncio.create_task(self._run_job(job_id))
        async with self._lock: self._running_jobs[job_id] = task
        try: await task
        except asyncio.CancelledError: pass
        finally:
            async with self._lock:
                self._running_jobs.pop(job_id, None)
                self._paused_jobs.discard(job_id)
                self._cancelled_jobs.discard(job_id)

    async def _run_job(self, job_id: str):
        db = await self._get_session()
        try:
            result = await db.execute(select(Job).where(Job.id == UUID(job_id)))
            job = result.scalar_one_or_none()
            if not job: return
            await self._update_job_status(db, job.id, JobStatus.RUNNING, JobPhase.INITIALIZATION)
            try:
                if job.job_type == "sync": await self._execute_sync_job(db, job)
                elif job.job_type == "process": await self._execute_process_job(db, job)
                elif job.job_type == "embed": await self._execute_embed_job(db, job)
                elif job.job_type == "full_ingest":
                    await self._execute_sync_job(db, job)
                    await self._execute_process_job(db, job)
                    await self._execute_embed_job(db, job)
                if self.is_job_cancelled(job_id): await self._update_job_status(db, job.id, JobStatus.CANCELLED)
                elif self.is_job_paused(job_id): await self._update_job_status(db, job.id, JobStatus.PAUSED)
                else: await self._update_job_status(db, job.id, JobStatus.COMPLETED, JobPhase.FINALIZATION)
            except Exception as e:
                await self._update_job_status(db, job.id, JobStatus.FAILED, error_message=str(e))
                logger.error(f"Job {job_id} failed: {e}")
        finally: await db.close()

    async def _check_pause_cancel(self, job_id: str) -> bool:
        return self.is_job_cancelled(job_id) or self.is_job_paused(job_id)

    async def _execute_sync_job(self, db: AsyncSession, job: Job):
        """Execute sync job with exclude pattern support."""
        await self._update_job_status(db, job.id, JobStatus.RUNNING, JobPhase.DISCOVERY)
        source_result = await db.execute(select(Source).where(Source.id == job.source_id))
        source = source_result.scalar_one_or_none()
        if not source or not source.repo_url: raise ValueError("Invalid source")
        
        # Create exclude pattern matcher
        exclude_matcher = ExcludePatternMatcher(
            exclude_patterns=source.exclude_patterns or [],
            exclude_folders=source.exclude_folders or []
        )
        
        # Get include patterns (if any)
        include_patterns = source.include_patterns or []
        
        repo_url = source.repo_url.rstrip("/").replace(".git", "")
        parts = repo_url.split("/")
        owner, repo_name = parts[-2], parts[-1]
        
        # Get project to fetch its GitHub config
        from app.db.models import GitHubConfig
        project_result = await db.execute(select(Project).where(Project.id == source.project_id))
        project = project_result.scalar_one_or_none()
        
        # Use project's GitHub config, or fall back to default
        gh_config = None
        if project and project.github_config_id:
            gh_result = await db.execute(select(GitHubConfig).where(GitHubConfig.id == project.github_config_id))
            gh_config = gh_result.scalar_one_or_none()
        
        if not gh_config:
            # Fall back to default GitHub config
            gh_result = await db.execute(select(GitHubConfig).where(GitHubConfig.is_default == True))
            gh_config = gh_result.scalar_one_or_none()
        
        token = gh_config.pat_token if gh_config else settings.REPO_PAT_TOKEN
        if not token: raise ValueError("No GitHub token")
        
        import httpx
        branch = source.branch or "main"
        
        # Use custom or default text extensions
        text_ext = source.text_extensions or [".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".md", ".txt", ".json", ".yaml", ".yml", ".html", ".css", ".scss", ".xml", ".sh", ".bash", ".zsh", ".c", ".cpp", ".h", ".hpp", ".rb", ".php", ".swift", ".kt", ".scala", ".sql", ".graphql", ".proto", ".toml", ".ini", ".cfg", ".conf", ".env", ".dockerfile", ".makefile"]
        
        # Get GitHub host from config (supports multiple GitHub hosts per source)
        # Each source can use a different GitHub config with its own host
        github_host = gh_config.host if gh_config else settings.GITHUB_HOST
        if github_host == "github.com":
            api_base = "https://api.github.com"
        else:
            # GitHub Enterprise or custom host (e.g., github.mycompany.com)
            api_base = f"https://{github_host}/api/v3"
        
        logger.info(f"Using GitHub API: {api_base} for source {source.id}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            branch_resp = await client.get(
                f"{api_base}/repos/{owner}/{repo_name}/branches/{branch}",
                headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
            )
            if branch_resp.status_code != 200:
                raise ValueError(f"Branch error: {branch_resp.text}")
            
            tree_sha = branch_resp.json()["commit"]["sha"]
            tree_resp = await client.get(
                f"{api_base}/repos/{owner}/{repo_name}/git/trees/{tree_sha}?recursive=1",
                headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
            )
            if tree_resp.status_code != 200:
                raise ValueError(f"Tree error: {tree_resp.text}")
            
            all_files = tree_resp.json().get("tree", [])
            
            # Filter files based on patterns
            filtered_files = []
            excluded_count = 0
            
            for f in all_files:
                if f["type"] != "blob":
                    continue
                
                file_path = f["path"]
                
                # Check text extension
                if not any(file_path.endswith(e) for e in text_ext):
                    continue
                
                # Check exclude patterns
                if exclude_matcher.should_exclude(file_path):
                    excluded_count += 1
                    logger.info(f"Excluded: {file_path}")
                    continue
                
                # Check include patterns (if specified, file must match at least one)
                if include_patterns:
                    included = False
                    for pattern in include_patterns:
                        if fnmatch.fnmatch(file_path, pattern) or fnmatch.fnmatch(file_path.split('/')[-1], pattern):
                            included = True
                            break
                    if not included:
                        continue
                
                filtered_files.append(f)
            
            total = len(filtered_files)
            await self._log_job(db, job.id, "info", f"Found {total} files (excluded {excluded_count})")
            await self._update_progress(db, job.id, total_items=total)
            
            for i, f in enumerate(filtered_files):
                if await self._check_pause_cancel(str(job.id)):
                    return
                
                try:
                    content_resp = await client.get(
                        f"{api_base}/repos/{owner}/{repo_name}/git/blobs/{f['sha']}",
                        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.raw"}
                    )
                    
                    if content_resp.status_code == 200:
                        content = content_resp.text
                        file_path = f["path"]
                        file_name = file_path.split("/")[-1]
                        file_ext = file_name.rsplit(".", 1)[-1] if "." in file_name else None
                        
                        existing = await db.execute(
                            select(SourceFile).where(
                                SourceFile.source_id == source.id,
                                SourceFile.file_path == file_path
                            )
                        )
                        sf = existing.scalar_one_or_none()
                        
                        if sf:
                            sf.raw_content = content
                            sf.is_processed = False
                            sf.file_size_bytes = len(content.encode('utf-8'))
                        else:
                            db.add(SourceFile(
                                source_id=source.id,
                                file_path=file_path,
                                file_name=file_name,
                                file_extension=file_ext,
                                file_size_bytes=len(content.encode('utf-8')),
                                raw_content=content
                            ))
                        await db.commit()
                        logger.info(f"Saved file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to fetch/save {f['path']}: {e}", exc_info=True)
                
                await self._update_progress(db, job.id, total_items=total, processed_items=i+1, current_item=f["path"])
            
            source.total_files = total
            source.status = "synced"
            source.last_sync_at = datetime.now(timezone.utc)
            source.last_commit_sha = tree_sha
            await db.commit()

    async def _execute_process_job(self, db: AsyncSession, job: Job):
        await self._update_job_status(db, job.id, JobStatus.RUNNING, JobPhase.CHUNKING)
        files_result = await db.execute(select(SourceFile).where(SourceFile.source_id == job.source_id, SourceFile.is_processed == False))
        files = list(files_result.scalars().all())
        if not files: return
        config_result = await db.execute(select(ProcessingConfig).limit(1))
        config = config_result.scalar_one_or_none()
        chunk_size = config.max_chunk_size if config else 2000
        chunk_overlap = config.chunk_overlap if config else 200
        from llama_index.core.node_parser import SentenceSplitter
        from llama_index.core.schema import Document
        splitter = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        total_chunks = 0
        for i, f in enumerate(files):
            if await self._check_pause_cancel(str(job.id)): return
            if not f.raw_content: continue
            doc = Document(text=f.raw_content, metadata={"file_path": f.file_path})
            nodes = splitter.get_nodes_from_documents([doc])
            for idx, n in enumerate(nodes):
                db.add(DocumentChunk(source_file_id=f.id, content=n.text, chunk_index=idx, chunk_metadata={"file_path": f.file_path}))
                total_chunks += 1
            f.is_processed, f.chunk_count = True, len(nodes)
            await db.commit()
            await self._update_progress(db, job.id, total_items=len(files), processed_items=i+1, current_item=f.file_path)
        
        # Update source statistics
        source = (await db.execute(select(Source).where(Source.id == job.source_id))).scalar_one_or_none()
        if source:
            source.total_chunks = total_chunks
            # Count all processed files for this source
            processed_count = await db.execute(
                select(SourceFile).where(
                    SourceFile.source_id == job.source_id,
                    SourceFile.is_processed == True
                )
            )
            source.processed_files = len(list(processed_count.scalars().all()))
            await db.commit()

    async def _embed_chunk(self, chunk, collection, source_id, svc, dim):
        """Embed a chunk and store in Milvus using LlamaIndex TextNode for proper text storage."""
        try:
            # Generate embedding
            emb = await svc.generate_embedding(chunk.content)
            
            # Get file path from metadata
            fp = chunk.chunk_metadata.get("file_path", "") if chunk.chunk_metadata else ""
            file_name = fp.split("/")[-1] if "/" in fp else fp
            
            # Create TextNode with proper metadata and text content
            from llama_index.core.schema import TextNode
            node = TextNode(
                id_=f"c_{chunk.id}",
                text=chunk.content,
                embedding=emb,
                metadata={
                    "chunk_id": str(chunk.id),
                    "source_id": source_id,
                    "file_path": fp,
                    "file_name": file_name,
                    "chunk_index": chunk.chunk_index
                }
            )
            
            # Use vector store (PGVector or Milvus based on settings)
            vector_store = svc.get_vector_store(
                collection_name=collection,
                dim=dim
            )
            
            # Insert the node
            vector_store.add([node])
            
            # Mark chunk as embedded
            chunk.has_embedding = True
            chunk.milvus_id = f"c_{chunk.id}"
            
            return True
            
        except Exception as e:
            logger.error(f"Embed error for chunk {chunk.id}: {e}", exc_info=True)
            return False

    async def _execute_embed_job(self, db: AsyncSession, job: Job):
        await self._update_job_status(db, job.id, JobStatus.RUNNING, JobPhase.EMBEDDING)
        chunks = list((await db.execute(select(DocumentChunk).join(SourceFile).where(SourceFile.source_id == job.source_id, DocumentChunk.has_embedding == False))).scalars().all())
        if not chunks: return
        source = (await db.execute(select(Source).where(Source.id == job.source_id))).scalar_one_or_none()
        project = (await db.execute(select(Project).where(Project.id == source.project_id))).scalar_one_or_none()
        if not project or not project.milvus_collection: raise ValueError("No Milvus collection")
        embed_cfg = (await db.execute(select(EmbeddingConfig).limit(1))).scalar_one_or_none()
        dim = embed_cfg.dimension if embed_cfg else settings.EMBEDDING_DIMENSION
        proc_cfg = (await db.execute(select(ProcessingConfig).limit(1))).scalar_one_or_none()
        parallel = proc_cfg.parallel_chunks if proc_cfg else settings.PARALLEL_CHUNKS
        
        # Get project-specific LlamaIndex service
        from app.services.llamaindex.service import get_llamaindex_service_for_project
        llamaindex_service = await get_llamaindex_service_for_project(db, str(project.id))
        
        processed, total = 0, len(chunks)
        for batch_start in range(0, total, parallel):
            if await self._check_pause_cancel(str(job.id)): return
            batch = chunks[batch_start:batch_start + parallel]
            results = await asyncio.gather(*[self._embed_chunk(c, project.milvus_collection, str(job.source_id), llamaindex_service, dim) for c in batch], return_exceptions=True)
            processed += sum(1 for r in results if r is True)
            await db.commit()
            await self._update_progress(db, job.id, total_items=total, processed_items=batch_start + len(batch), current_item=f"Batch {batch_start//parallel+1}")

    async def resume_pending_jobs(self):
        db = await self._get_session()
        try:
            jobs = list((await db.execute(select(Job).where(Job.status.in_([JobStatus.RUNNING.value, JobStatus.PENDING.value])))).scalars().all())
            for j in jobs: j.status = JobStatus.PENDING.value; await db.commit()
        finally: await db.close()

job_executor = JobExecutor()
