# InfraMind-AI API Documentation

Complete API reference for InfraMind-AI backend services.

**Base URL:** `http://localhost:8000`  
**API Version:** v1  
**API Prefix:** `/api/v1`

---

## Table of Contents

1. [Health Check](#health-check)
2. [Projects](#projects)
3. [Sources](#sources)
4. [Ingestion Jobs](#ingestion-jobs)
5. [Chat / RAG](#chat--rag)
6. [Data Models](#data-models)

---

## Health Check

### GET `/health`

Check the health status of the service and all dependent services.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "milvus": "up",
    "redis": "up"
  },
  "version": "1.0.0",
  "timestamp": "2025-11-25T12:00:00.000000",
  "performance_config": {
    "embedding_batch_size": 100,
    "ingestion_batch_size": 150,
    "max_concurrent_embedding_requests": 2
  },
  "cache_stats": {
    "hits": 150,
    "misses": 25,
    "size": 50
  }
}
```

**Status Codes:**
- `200 OK` - Service is healthy or degraded
- Status is "degraded" if any dependent service is down

---

## Projects

### POST `/api/v1/projects/`

Create a new project with a dedicated Milvus vector collection.

**Request Body:**
```json
{
  "name": "My Project",
  "description": "Project description",
  "embedding_batch_size": 100,
  "ingestion_batch_size": 150,
  "max_concurrent_requests": 2,
  "max_parallel_files": 3,
  "chunk_size": 1000,
  "chunk_overlap": 200,
  "max_single_chunk_size": 8000
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Project",
  "description": "Project description",
  "milvus_collection": "project_abc12345_collection",
  "embedding_batch_size": 100,
  "ingestion_batch_size": 150,
  "max_concurrent_requests": 2,
  "max_parallel_files": 3,
  "chunk_size": 1000,
  "chunk_overlap": 200,
  "max_single_chunk_size": 8000,
  "created_at": "2025-11-25T12:00:00.000000",
  "updated_at": "2025-11-25T12:00:00.000000"
}
```

**Parameters:**
- `name` (required): Project name
- `description` (optional): Project description
- `embedding_batch_size` (optional): Batch size for embedding generation (default: 100)
- `ingestion_batch_size` (optional): Batch size for vector ingestion (default: 150)
- `max_concurrent_requests` (optional): Max concurrent embedding API requests (default: 2)
- `max_parallel_files` (optional): Max files to process in parallel (default: 3)
- `chunk_size` (optional): Text chunk size in tokens (default: 1000)
- `chunk_overlap` (optional): Overlap between chunks in tokens (default: 200)
- `max_single_chunk_size` (optional): Max size for single chunk files (default: 8000)

---

### GET `/api/v1/projects/`

List all projects with source counts.

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum number of records to return (default: 20)

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Project",
    "description": "Project description",
    "milvus_collection": "project_abc12345_collection",
    "source_count": 3,
    "embedding_batch_size": 100,
    "ingestion_batch_size": 150,
    "max_concurrent_requests": 2,
    "max_parallel_files": 3,
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "max_single_chunk_size": 8000,
    "created_at": "2025-11-25T12:00:00.000000",
    "updated_at": "2025-11-25T12:00:00.000000"
  }
]
```

---

### GET `/api/v1/projects/{project_id}`

Get detailed information about a specific project.

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Project",
  "description": "Project description",
  "milvus_collection": "project_abc12345_collection",
  "source_count": 3,
  "embedding_batch_size": 100,
  "ingestion_batch_size": 150,
  "max_concurrent_requests": 2,
  "max_parallel_files": 3,
  "chunk_size": 1000,
  "chunk_overlap": 200,
  "max_single_chunk_size": 8000,
  "created_at": "2025-11-25T12:00:00.000000",
  "updated_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Project found
- `404 Not Found` - Project does not exist

---

### PUT `/api/v1/projects/{project_id}`

Update project configuration and settings.

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "embedding_batch_size": 150,
  "ingestion_batch_size": 200,
  "max_concurrent_requests": 3,
  "max_parallel_files": 5,
  "chunk_size": 1200,
  "chunk_overlap": 250,
  "max_single_chunk_size": 10000
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Project Name",
  "description": "Updated description",
  "milvus_collection": "project_abc12345_collection",
  "embedding_batch_size": 150,
  "ingestion_batch_size": 200,
  "max_concurrent_requests": 3,
  "max_parallel_files": 5,
  "chunk_size": 1200,
  "chunk_overlap": 250,
  "max_single_chunk_size": 10000,
  "created_at": "2025-11-25T12:00:00.000000",
  "updated_at": "2025-11-25T13:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Project updated successfully
- `404 Not Found` - Project does not exist

---

### DELETE `/api/v1/projects/{project_id}`

Delete a project and all associated sources.

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - Project deleted successfully
- `404 Not Found` - Project does not exist

---

## Sources

### POST `/api/v1/projects/{project_id}/sources`

Add a new source to a project (GitHub repository, local files, etc.).

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Request Body:**
```json
{
  "name": "My GitHub Repo",
  "type": "github",
  "config": {
    "repo_url": "https://github.com/owner/repo",
    "branch": "main",
    "access_token": "ghp_xxxxxxxxxxxxx"
  },
  "include_patterns": ["*.py", "*.md", "*.js"],
  "exclude_patterns": ["**/node_modules/**", "**/__pycache__/**", "**/venv/**"]
}
```

**Source Types:**
- `github`: GitHub repository
- `local`: Local file system (future)
- `web`: Web scraping (future)

**Response:** `201 Created`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My GitHub Repo",
  "type": "github",
  "status": "pending",
  "config": {
    "repo_url": "https://github.com/owner/repo",
    "branch": "main"
  },
  "include_patterns": ["*.py", "*.md", "*.js"],
  "exclude_patterns": ["**/node_modules/**", "**/__pycache__/**"],
  "created_at": "2025-11-25T12:00:00.000000",
  "updated_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `201 Created` - Source created successfully
- `404 Not Found` - Project does not exist

---

### GET `/api/v1/projects/{project_id}/sources`

List all sources for a specific project.

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Response:** `200 OK`
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My GitHub Repo",
    "type": "github",
    "status": "completed",
    "config": {
      "repo_url": "https://github.com/owner/repo",
      "branch": "main"
    },
    "include_patterns": ["*.py", "*.md"],
    "exclude_patterns": ["**/node_modules/**"],
    "created_at": "2025-11-25T12:00:00.000000",
    "updated_at": "2025-11-25T12:30:00.000000"
  }
]
```

---

### PUT `/api/v1/sources/{source_id}`

Update an existing source configuration.

**Path Parameters:**
- `source_id` (UUID): Source identifier

**Request Body:**
```json
{
  "name": "Updated Source Name",
  "type": "github",
  "config": {
    "repo_url": "https://github.com/owner/repo",
    "branch": "develop"
  },
  "include_patterns": ["*.py", "*.md", "*.ts"],
  "exclude_patterns": ["**/dist/**", "**/build/**"]
}
```

**Response:** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Source Name",
  "type": "github",
  "status": "pending",
  "config": {
    "repo_url": "https://github.com/owner/repo",
    "branch": "develop"
  },
  "include_patterns": ["*.py", "*.md", "*.ts"],
  "exclude_patterns": ["**/dist/**", "**/build/**"],
  "created_at": "2025-11-25T12:00:00.000000",
  "updated_at": "2025-11-25T13:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Source updated successfully
- `404 Not Found` - Source does not exist

---

### DELETE `/api/v1/sources/{source_id}`

Delete a source and its associated vectors.

**Path Parameters:**
- `source_id` (UUID): Source identifier

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - Source deleted successfully
- `404 Not Found` - Source does not exist

---

## Ingestion Jobs

### POST `/api/v1/sources/{source_id}/ingest`

Start an ingestion job to process and embed source content into the vector database.

**Path Parameters:**
- `source_id` (UUID): Source identifier

**Response:** `202 Accepted`
```json
{
  "job_id": "770e8400-e29b-41d4-a716-446655440002",
  "source_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "phase": "initialization",
  "total_documents": 0,
  "processed_documents": 0,
  "total_chunks": 0,
  "processed_chunks": 0,
  "error_count": 0,
  "current_file_path": null,
  "current_file_chunks": 0,
  "current_file_status": null,
  "total_tokens": 0,
  "avg_tokens_per_file": 0,
  "processing_speed": 0,
  "eta_seconds": null,
  "config_embedding_batch_size": 100,
  "config_ingestion_batch_size": 150,
  "config_max_concurrent_requests": 2,
  "config_max_parallel_files": 3,
  "config_chunk_size": 1000,
  "config_chunk_overlap": 200,
  "started_at": "2025-11-25T12:00:00.000000",
  "completed_at": null,
  "created_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `202 Accepted` - Ingestion job started successfully
- `404 Not Found` - Source does not exist

**Note:** The ingestion runs as a background task. Use job status endpoints to monitor progress.

---

### GET `/api/v1/sources/{source_id}/active-job`

Get the most recent active ingestion job for a source.

**Path Parameters:**
- `source_id` (UUID): Source identifier

**Response:** `200 OK`
```json
{
  "job_id": "770e8400-e29b-41d4-a716-446655440002",
  "source_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "processing",
  "phase": "embedding",
  "total_documents": 150,
  "processed_documents": 75,
  "total_chunks": 1500,
  "processed_chunks": 750,
  "error_count": 2,
  "current_file_path": "src/services/api.py",
  "current_file_chunks": 15,
  "current_file_status": "embedding",
  "total_tokens": 125000,
  "avg_tokens_per_file": 833,
  "processing_speed": 5.2,
  "eta_seconds": 14.4,
  "config_embedding_batch_size": 100,
  "config_ingestion_batch_size": 150,
  "config_max_concurrent_requests": 2,
  "config_max_parallel_files": 3,
  "config_chunk_size": 1000,
  "config_chunk_overlap": 200,
  "started_at": "2025-11-25T12:00:00.000000",
  "completed_at": null,
  "created_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Active job found
- `404 Not Found` - No active ingestion job found

**Job Statuses:**
- `queued`: Job is queued for processing
- `processing`: Job is currently running
- `completed`: Job finished successfully
- `failed`: Job encountered an error
- `cancelled`: Job was cancelled by user

**Job Phases:**
- `initialization`: Setting up the job
- `discovery`: Finding and filtering files
- `chunking`: Splitting files into chunks
- `embedding`: Generating embeddings
- `ingestion`: Storing vectors in database
- `finalization`: Cleanup and final updates

---

### GET `/api/v1/jobs/{job_id}`

Get detailed status of a specific ingestion job.

**Path Parameters:**
- `job_id` (UUID): Ingestion job identifier

**Response:** `200 OK`
```json
{
  "job_id": "770e8400-e29b-41d4-a716-446655440002",
  "source_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "phase": "finalization",
  "total_documents": 150,
  "processed_documents": 150,
  "total_chunks": 1500,
  "processed_chunks": 1500,
  "error_count": 3,
  "current_file_path": null,
  "current_file_chunks": 0,
  "current_file_status": null,
  "total_tokens": 250000,
  "avg_tokens_per_file": 1666,
  "processing_speed": 5.5,
  "eta_seconds": 0,
  "config_embedding_batch_size": 100,
  "config_ingestion_batch_size": 150,
  "config_max_concurrent_requests": 2,
  "config_max_parallel_files": 3,
  "config_chunk_size": 1000,
  "config_chunk_overlap": 200,
  "started_at": "2025-11-25T12:00:00.000000",
  "completed_at": "2025-11-25T12:45:00.000000",
  "created_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Job found
- `404 Not Found` - Job does not exist

---

### GET `/api/v1/jobs`

List all ingestion jobs with optional status filtering.

**Query Parameters:**
- `status` (optional): Filter by job status (queued, processing, completed, failed, cancelled)

**Response:** `200 OK`
```json
[
  {
    "job_id": "770e8400-e29b-41d4-a716-446655440002",
    "source_id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "phase": "finalization",
    "total_documents": 150,
    "processed_documents": 150,
    "total_chunks": 1500,
    "processed_chunks": 1500,
    "error_count": 3,
    "started_at": "2025-11-25T12:00:00.000000",
    "completed_at": "2025-11-25T12:45:00.000000",
    "created_at": "2025-11-25T12:00:00.000000"
  }
]
```

---

### POST `/api/v1/jobs/{job_id}/cancel`

Cancel a running or queued ingestion job.

**Path Parameters:**
- `job_id` (UUID): Ingestion job identifier

**Response:** `200 OK`
```json
{
  "job_id": "770e8400-e29b-41d4-a716-446655440002",
  "source_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "cancelled",
  "completed_at": "2025-11-25T12:30:00.000000"
}
```

**Status Codes:**
- `200 OK` - Job cancelled successfully
- `400 Bad Request` - Job cannot be cancelled (already completed/failed/cancelled)
- `404 Not Found` - Job does not exist

---

### POST `/api/v1/jobs/{job_id}/retry`

Retry a failed or cancelled ingestion job. Resumes from where it left off.

**Path Parameters:**
- `job_id` (UUID): Ingestion job identifier

**Response:** `200 OK`
```json
{
  "job_id": "770e8400-e29b-41d4-a716-446655440002",
  "source_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "queued",
  "phase": "chunking",
  "total_documents": 150,
  "processed_documents": 50,
  "total_chunks": 1500,
  "processed_chunks": 500,
  "started_at": "2025-11-25T13:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Job retry started successfully
- `400 Bad Request` - Job cannot be retried (not failed/cancelled)
- `404 Not Found` - Job or source does not exist

---

### DELETE `/api/v1/jobs/{job_id}`

Delete an ingestion job record (completed, failed, or cancelled jobs only).

**Path Parameters:**
- `job_id` (UUID): Ingestion job identifier

**Response:** `204 No Content`

**Status Codes:**
- `204 No Content` - Job deleted successfully
- `400 Bad Request` - Job cannot be deleted (still running)
- `404 Not Found` - Job does not exist

---

### GET `/api/v1/jobs/{job_id}/logs`

Stream real-time ingestion job logs using Server-Sent Events (SSE).

**Path Parameters:**
- `job_id` (UUID): Ingestion job identifier

**Response:** `200 OK` (streaming)

**Event Stream Format:**
```
data: {"timestamp": "2025-11-25T12:00:00.000000", "type": "connected", "message": "Log stream connected"}

data: {"timestamp": "2025-11-25T12:00:01.000000", "type": "info", "message": "Starting ingestion for source...", "historical": true}

data: {"timestamp": "2025-11-25T12:00:05.000000", "type": "progress", "message": "Processing file: src/main.py", "data": {"file": "src/main.py", "chunks": 10}}

data: {"timestamp": "2025-11-25T12:00:30.000000", "type": "history_complete", "message": "Loaded 25 historical logs", "count": 25}

data: {"timestamp": "2025-11-25T12:01:00.000000", "type": "ping", "message": "keepalive"}

data: {"timestamp": "2025-11-25T12:45:00.000000", "type": "job_completed", "message": "Job completed", "status": "completed"}
```

**Log Types:**
- `connected`: Stream connection established
- `info`: General information
- `progress`: Progress updates
- `warning`: Non-critical issues
- `error`: Error messages
- `success`: Success messages
- `history_complete`: Historical logs loaded
- `ping`: Keepalive message
- `job_completed`: Job finished

**Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Note:** This endpoint sends all historical logs first, then streams new logs in real-time. The stream automatically closes when the job completes.

---

## Chat / RAG

### POST `/api/v1/chat/`

Send a chat message and get RAG-powered response with sources.

**Request Body:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": null,
  "message": "How do I configure the database connection?",
  "max_context_chunks": 5
}
```

**Parameters:**
- `project_id` (required): Project to query
- `session_id` (optional): Existing chat session ID (creates new if null)
- `message` (required): User's question
- `max_context_chunks` (optional): Maximum number of relevant chunks to retrieve (default: 5)

**Response:** `200 OK`
```json
{
  "message_id": "880e8400-e29b-41d4-a716-446655440003",
  "session_id": "990e8400-e29b-41d4-a716-446655440004",
  "response": "To configure the database connection, you need to set the following environment variables in your .env file:\n\nPOSTGRES_HOST=localhost\nPOSTGRES_PORT=5432\nPOSTGRES_USER=your_user\nPOSTGRES_PASSWORD=your_password\nPOSTGRES_DB=your_database\n\nThen the application will automatically load these settings from app/config.py.",
  "sources": [
    {
      "source_id": "660e8400-e29b-41d4-a716-446655440001",
      "file_path": "backend/app/config.py",
      "chunk_text": "# Database configuration\nPOSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')\nPOSTGRES_PORT = int(os.getenv('POSTGRES_PORT', 5432))",
      "score": 0.92
    },
    {
      "source_id": "660e8400-e29b-41d4-a716-446655440001",
      "file_path": "README.md",
      "chunk_text": "## Environment Variables\n\nCopy .env.example to .env and configure:\n- POSTGRES_HOST\n- POSTGRES_PORT\n- POSTGRES_USER",
      "score": 0.88
    }
  ],
  "created_at": "2025-11-25T12:00:00.000000"
}
```

**Status Codes:**
- `200 OK` - Response generated successfully
- `404 Not Found` - Project or session not found
- `500 Internal Server Error` - Failed to generate response

---

### POST `/api/v1/chat/stream`

Send a chat message and get streaming RAG-powered response with real-time updates.

**Request Body:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": null,
  "message": "Explain the ingestion process",
  "max_context_chunks": 5
}
```

**Response:** `200 OK` (streaming)

**Event Stream Format:**
```
data: {"type": "session", "session_id": "990e8400-e29b-41d4-a716-446655440004", "message_id": "880e8400-e29b-41d4-a716-446655440003"}

data: {"type": "thinking", "message": "Analyzing your question..."}

data: {"type": "sources", "sources": [{"source_id": "660e8400-e29b-41d4-a716-446655440001", "file_path": "backend/app/core/ingestion.py", "score": 0.95}]}

data: {"type": "content", "content": "The ingestion "}

data: {"type": "content", "content": "process involves "}

data: {"type": "content", "content": "several steps..."}

data: {"type": "done", "message_id": "880e8400-e29b-41d4-a716-446655440003"}
```

**Event Types:**
- `session`: Session information (session_id, message_id)
- `thinking`: Processing status message
- `sources`: Retrieved context sources
- `content`: Streaming response chunks
- `done`: Response complete with message_id
- `error`: Error occurred during processing

**Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Status Codes:**
- `200 OK` - Stream started successfully
- `404 Not Found` - Project or session not found

---

### GET `/api/v1/chat/sessions/{project_id}`

List all chat sessions for a project.

**Path Parameters:**
- `project_id` (UUID): Project identifier

**Response:** `200 OK`
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Database Configuration Questions",
    "message_count": 8,
    "created_at": "2025-11-25T12:00:00.000000",
    "updated_at": "2025-11-25T12:30:00.000000"
  }
]
```

---

### GET `/api/v1/chat/sessions/{session_id}/messages`

Get all messages in a chat session with conversation history.

**Path Parameters:**
- `session_id` (UUID): Chat session identifier

**Response:** `200 OK`
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "session_id": "990e8400-e29b-41d4-a716-446655440004",
    "role": "user",
    "content": "How do I configure the database?",
    "sources": null,
    "created_at": "2025-11-25T12:00:00.000000"
  },
  {
    "id": "881e8400-e29b-41d4-a716-446655440005",
    "session_id": "990e8400-e29b-41d4-a716-446655440004",
    "role": "assistant",
    "content": "To configure the database connection, you need to set environment variables...",
    "sources": [
      {
        "source_id": "660e8400-e29b-41d4-a716-446655440001",
        "file_path": "backend/app/config.py",
        "score": 0.92
      }
    ],
    "created_at": "2025-11-25T12:00:05.000000"
  }
]
```

---

### DELETE `/api/v1/chat/sessions/{session_id}`

Delete a chat session and all its messages.

**Path Parameters:**
- `session_id` (UUID): Chat session identifier

**Response:** `200 OK`
```json
{
  "status": "deleted",
  "session_id": "990e8400-e29b-41d4-a716-446655440004"
}
```

**Status Codes:**
- `200 OK` - Session deleted successfully
- `404 Not Found` - Session does not exist

---

## Data Models

### Project
```typescript
{
  id: UUID
  name: string
  description: string | null
  milvus_collection: string
  embedding_batch_size: number
  ingestion_batch_size: number
  max_concurrent_requests: number
  max_parallel_files: number
  chunk_size: number
  chunk_overlap: number
  max_single_chunk_size: number
  created_at: datetime
  updated_at: datetime
}
```

### Source
```typescript
{
  id: UUID
  project_id: UUID
  name: string
  type: "github" | "local" | "web"
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  config: object
  include_patterns: string[]
  exclude_patterns: string[]
  error_message: string | null
  created_at: datetime
  updated_at: datetime
}
```

### Ingestion Job
```typescript
{
  job_id: UUID
  source_id: UUID
  status: "queued" | "processing" | "completed" | "failed" | "cancelled"
  phase: "initialization" | "discovery" | "chunking" | "embedding" | "ingestion" | "finalization"
  total_documents: number
  processed_documents: number
  total_chunks: number
  processed_chunks: number
  error_count: number
  current_file_path: string | null
  current_file_chunks: number
  current_file_status: string | null
  total_tokens: number
  avg_tokens_per_file: number
  processing_speed: number
  eta_seconds: number | null
  config_embedding_batch_size: number
  config_ingestion_batch_size: number
  config_max_concurrent_requests: number
  config_max_parallel_files: number
  config_chunk_size: number
  config_chunk_overlap: number
  started_at: datetime | null
  completed_at: datetime | null
  created_at: datetime
}
```

### Chat Session
```typescript
{
  id: UUID
  project_id: UUID
  title: string
  message_count: number
  created_at: datetime
  updated_at: datetime
}
```

### Chat Message
```typescript
{
  id: UUID
  session_id: UUID
  role: "user" | "assistant"
  content: string
  sources: Source[] | null
  created_at: datetime
}
```

### Source Reference
```typescript
{
  source_id: UUID
  file_path: string
  chunk_text: string
  score: number  // Similarity score (0-1)
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `202 Accepted` - Request accepted for background processing
- `204 No Content` - Request successful with no response body
- `400 Bad Request` - Invalid request parameters or body
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error occurred
- `503 Service Unavailable` - Dependent service is down
- `504 Gateway Timeout` - Request timed out
- `429 Too Many Requests` - Rate limit exceeded
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `415 Unsupported Media Type` - Unsupported content type
- `422 Unprocessable Entity` - Validation error
- `501 Not Implemented` - Feature not implemented
- `502 Bad Gateway` - Invalid response from upstream server
- `408 Request Timeout` - Client request timed out
- `524 A Timeout Occurred` - Cloudflare timeout

---

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

---

## Authentication

Currently, no authentication is required. All endpoints are publicly accessible. This is suitable for development but should be secured in production.

---

## Pagination

Endpoints that return lists support pagination via query parameters:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 20, max: 100)

---

## WebSocket Support

WebSocket endpoints are not currently available. Real-time updates use Server-Sent Events (SSE) instead.

---

## Version History

- **v1.0.0** (2025-11-25) - Initial API release
  - Projects CRUD
  - Sources management
  - Ingestion jobs with real-time progress
  - RAG-powered chat with streaming
  - Health monitoring

---

## Support & Contact

For issues, questions, or contributions, please visit:
- GitHub: https://github.com/ashsaym/InfraMind-AI
- Documentation: `/docs` directory

---

**Last Updated:** November 25, 2025
