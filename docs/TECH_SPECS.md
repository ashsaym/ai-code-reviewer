# 🔧 InfraMind-AI Technical Specifications

## Overview
This document provides detailed technical specifications for the InfraMind-AI platform, including API endpoints, database schemas, data models, and integration specifications.

---

## 📡 API Specifications

### Base Configuration
- **Protocol**: HTTP/HTTPS
- **Base URL**: `http://localhost:8000/api/v1` (dev) / `https://inframind.internal/api/v1` (prod)
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests/minute per user

---

### API Endpoints

#### 🔐 Authentication

##### POST /auth/register
Register a new user.

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "full_name": "string",
  "created_at": "datetime"
}
```

---

##### POST /auth/login
Authenticate user and get JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

##### POST /auth/refresh
Refresh JWT token.

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

#### 📁 Projects

##### GET /projects
List all projects for the authenticated user.

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `search` (string, optional)

**Response (200):**
```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "projects": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "created_at": "datetime",
      "updated_at": "datetime",
      "source_count": 5,
      "llm_provider": "openwebui",
      "status": "active"
    }
  ]
}
```

---

##### POST /projects
Create a new project.

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "llm_provider": "openwebui",
  "llm_config": {
    "model": "qwen3-coder-30b",
    "api_url": "string",
    "api_key": "string"
  },
  "embedding_config": {
    "model": "qwen3-embedding",
    "dimension": 1024
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "created_at": "datetime",
  "milvus_collection": "project_uuid_collection",
  "status": "active"
}
```

---

##### GET /projects/{project_id}
Get project details.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "sources": [...],
  "llm_provider": "openwebui",
  "llm_config": {...},
  "embedding_config": {...},
  "statistics": {
    "total_documents": 1234,
    "total_chunks": 5678,
    "total_vectors": 5678,
    "storage_size_mb": 123.45
  }
}
```

---

##### PUT /projects/{project_id}
Update project.

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "llm_config": {...}
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "updated_at": "datetime"
}
```

---

##### DELETE /projects/{project_id}
Delete project (cascades to sources and vectors).

**Response (204):** No content

---

#### 📚 Sources

##### GET /projects/{project_id}/sources
List all sources for a project.

**Response (200):**
```json
{
  "sources": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "type": "github",
      "name": "my-repo",
      "config": {
        "repo_url": "https://github.com/org/repo",
        "branch": "main"
      },
      "status": "ingested",
      "last_ingested": "datetime",
      "document_count": 123
    }
  ]
}
```

---

##### POST /projects/{project_id}/sources
Add a new source to project.

**Request (GitHub):**
```json
{
  "type": "github",
  "name": "My Repo",
  "config": {
    "repo_url": "https://github.com/org/repo",
    "branch": "main",
    "access_token": "ghp_xxx",
    "include_patterns": ["*.py", "*.md"],
    "exclude_patterns": ["tests/*"]
  }
}
```

**Request (Confluence):**
```json
{
  "type": "confluence",
  "name": "Engineering Docs",
  "config": {
    "base_url": "https://confluence.company.com",
    "space_key": "ENG",
    "username": "user@company.com",
    "api_token": "xxx",
    "include_attachments": true
  }
}
```

**Request (File Upload):**
```json
{
  "type": "file",
  "name": "Architecture Docs",
  "config": {
    "files": ["file_id_1", "file_id_2"]
  }
}
```

**Request (Kubernetes):**
```json
{
  "type": "kubernetes",
  "name": "Production Cluster",
  "config": {
    "cluster_name": "prod-k8s",
    "kubeconfig": "base64_encoded_kubeconfig",
    "namespaces": ["default", "production"],
    "ingest_metadata": true
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "type": "github",
  "name": "My Repo",
  "status": "pending",
  "created_at": "datetime"
}
```

---

##### DELETE /sources/{source_id}
Delete a source and its vectors.

**Response (204):** No content

---

#### 🔄 Ingestion

##### POST /ingestion/start/{source_id}
Start ingestion for a source.

**Response (202):**
```json
{
  "job_id": "uuid",
  "source_id": "uuid",
  "status": "queued",
  "created_at": "datetime"
}
```

---

##### GET /ingestion/status/{job_id}
Get ingestion job status.

**Response (200):**
```json
{
  "job_id": "uuid",
  "source_id": "uuid",
  "status": "processing",
  "progress": {
    "total_documents": 100,
    "processed_documents": 45,
    "total_chunks": 500,
    "processed_chunks": 225,
    "percentage": 45.0
  },
  "started_at": "datetime",
  "estimated_completion": "datetime",
  "errors": []
}
```

---

##### POST /ingestion/cancel/{job_id}
Cancel an ingestion job.

**Response (200):**
```json
{
  "job_id": "uuid",
  "status": "cancelled"
}
```

---

#### 💬 Chat & RAG

##### POST /chat
Send a chat message and get RAG response.

**Request:**
```json
{
  "project_id": "uuid",
  "message": "string",
  "session_id": "uuid",
  "stream": false,
  "include_kubernetes_data": false,
  "max_context_chunks": 10
}
```

**Response (200):**
```json
{
  "message_id": "uuid",
  "response": "string",
  "sources": [
    {
      "source_id": "uuid",
      "source_name": "string",
      "source_type": "github",
      "chunk_text": "string",
      "relevance_score": 0.95,
      "metadata": {
        "file_path": "src/main.py",
        "line_start": 100,
        "line_end": 150
      }
    }
  ],
  "kubernetes_context": {...},
  "created_at": "datetime"
}
```

**Response (200, Streaming):**
Server-Sent Events stream:
```
data: {"type": "token", "content": "Hello"}
data: {"type": "token", "content": " world"}
data: {"type": "sources", "sources": [...]}
data: {"type": "done"}
```

---

##### GET /chat/sessions
List chat sessions for a project.

**Query Parameters:**
- `project_id` (uuid, required)
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "string",
      "message_count": 15,
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

##### GET /chat/sessions/{session_id}/messages
Get messages in a chat session.

**Response (200):**
```json
{
  "session_id": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "string",
      "created_at": "datetime"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "string",
      "sources": [...],
      "created_at": "datetime"
    }
  ]
}
```

---

#### ☸️ Kubernetes

##### GET /kubernetes/clusters
List configured Kubernetes clusters.

**Query Parameters:**
- `project_id` (uuid, required)

**Response (200):**
```json
{
  "clusters": [
    {
      "id": "uuid",
      "name": "prod-k8s",
      "status": "connected",
      "version": "v1.28.0",
      "node_count": 10,
      "namespace_count": 15
    }
  ]
}
```

---

##### GET /kubernetes/clusters/{cluster_id}/namespaces
List namespaces in a cluster.

**Response (200):**
```json
{
  "namespaces": [
    {
      "name": "default",
      "status": "Active",
      "created_at": "datetime"
    }
  ]
}
```

---

##### GET /kubernetes/clusters/{cluster_id}/pods
List pods in a cluster.

**Query Parameters:**
- `namespace` (string, optional)
- `label_selector` (string, optional)
- `field_selector` (string, optional)

**Response (200):**
```json
{
  "pods": [
    {
      "name": "my-app-xyz",
      "namespace": "production",
      "status": "Running",
      "ready": "2/2",
      "restarts": 0,
      "age": "3d",
      "node": "node-1",
      "containers": [
        {
          "name": "app",
          "image": "my-app:v1.2.3",
          "ready": true
        }
      ]
    }
  ]
}
```

---

##### GET /kubernetes/clusters/{cluster_id}/pods/{namespace}/{pod_name}/logs
Get pod logs.

**Query Parameters:**
- `container` (string, optional)
- `tail` (int, default: 100)
- `follow` (bool, default: false)
- `timestamps` (bool, default: true)

**Response (200):**
```json
{
  "logs": "string (multiline)"
}
```

**Response (200, Streaming with follow=true):**
Server-Sent Events stream of log lines.

---

##### POST /kubernetes/query
Execute a natural language query on Kubernetes data.

**Request:**
```json
{
  "project_id": "uuid",
  "cluster_id": "uuid",
  "query": "Which pods are using the most memory?"
}
```

**Response (200):**
```json
{
  "answer": "string",
  "data": {...},
  "suggested_actions": ["string"]
}
```

---

#### 🤖 OpenWebUI Integration

**Configuration:** OpenWebUI API is configured exclusively via environment variables in `backend/.env`:
```bash
OPENWEB_API_URL=http://localhost:3000/api
OPENWEB_API_KEY=your_api_key_here
OPENWEB_CHAT_MODEL=qwen3-coder-30b
OPENWEB_EMBEDDING_MODEL=qwen3-embedding-8b
```

**Features:**
- Chat completions via OpenWebUI API
- Text embeddings for vector search
- Automatic retry and error handling
- Health check endpoint for monitoring

**Note:** No UI configuration needed - all settings are backend environment-configured.

---

#### 📤 File Upload

##### POST /files/upload
Upload files for ingestion.

**Request:** multipart/form-data
- `files`: file[] (multiple files)
- `project_id`: uuid

**Response (201):**
```json
{
  "uploaded_files": [
    {
      "id": "uuid",
      "filename": "architecture.pdf",
      "size_bytes": 1234567,
      "mime_type": "application/pdf",
      "status": "uploaded"
    }
  ]
}
```

---

#### 🏥 Health & Metrics

##### GET /health
Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "milvus": "up",
    "redis": "up",
    "celery": "up"
  },
  "version": "1.0.0",
  "timestamp": "datetime"
}
```

---

## 🗄️ Database Schemas

### PostgreSQL Schema

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

#### projects
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    milvus_collection VARCHAR(255) UNIQUE NOT NULL,
    llm_provider VARCHAR(50) NOT NULL,
    llm_config JSONB NOT NULL,
    embedding_config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
```

---

#### sources
```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- github, confluence, file, kubernetes
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL, -- encrypted sensitive data
    status VARCHAR(20) DEFAULT 'pending',
    last_ingested_at TIMESTAMP,
    document_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sources_project_id ON sources(project_id);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_status ON sources(status);
```

---

#### ingestion_jobs
```sql
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    celery_task_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'queued',
    total_documents INTEGER DEFAULT 0,
    processed_documents INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    processed_chunks INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ingestion_jobs_source_id ON ingestion_jobs(source_id);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX idx_ingestion_jobs_celery_task_id ON ingestion_jobs(celery_task_id);
```

---

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

---

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    sources JSONB,
    kubernetes_context JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

---

#### kubernetes_clusters
```sql
CREATE TABLE kubernetes_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    kubeconfig TEXT NOT NULL, -- encrypted
    status VARCHAR(20) DEFAULT 'active',
    version VARCHAR(50),
    last_connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kubernetes_clusters_project_id ON kubernetes_clusters(project_id);
```

---

### Milvus Schema

#### Collection: project_{uuid}_collection

**Fields:**
```python
{
    "id": DataType.INT64,  # Auto-increment primary key
    "chunk_id": DataType.VARCHAR(36),  # UUID
    "source_id": DataType.VARCHAR(36),  # UUID
    "source_type": DataType.VARCHAR(50),  # github, confluence, file, k8s
    "source_name": DataType.VARCHAR(255),
    "document_id": DataType.VARCHAR(255),  # original document reference
    "chunk_index": DataType.INT32,
    "content": DataType.VARCHAR(65535),  # chunk text
    "embedding": DataType.FLOAT_VECTOR(1024),  # Qwen3-Embedding dimension
    "metadata": DataType.JSON,  # flexible metadata
    "created_at": DataType.INT64  # Unix timestamp
}
```

**Indexes:**
- Vector index on `embedding` field (IVF_FLAT or HNSW)
- Scalar index on `source_id`
- Scalar index on `source_type`

**Metadata Examples:**
```json
{
  "file_path": "src/api/main.py",
  "line_start": 100,
  "line_end": 150,
  "language": "python",
  "repo_url": "https://github.com/org/repo",
  "commit_sha": "abc123"
}
```

```json
{
  "page_id": "123456",
  "page_title": "Architecture Overview",
  "space_key": "ENG",
  "page_url": "https://confluence.company.com/...",
  "last_modified": "2024-01-15"
}
```

---

## 📦 Data Models (Pydantic)

### Project Model
```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class LLMConfig(BaseModel):
    model: str
    api_url: str
    api_key: str
    temperature: float = 0.7
    max_tokens: int = 2000

class EmbeddingConfig(BaseModel):
    model: str = "qwen3-embedding"
    dimension: int = 1024
    api_url: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    llm_provider: str
    llm_config: LLMConfig
    embedding_config: EmbeddingConfig

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    milvus_collection: str
    llm_provider: str
    status: str
    created_at: datetime
    updated_at: datetime
    source_count: int = 0

class ProjectDetail(ProjectResponse):
    llm_config: LLMConfig
    embedding_config: EmbeddingConfig
    sources: list
    statistics: Dict[str, Any]
```

---

### Source Model
```python
class SourceConfig(BaseModel):
    pass

class GitHubConfig(SourceConfig):
    repo_url: str
    branch: str = "main"
    access_token: str
    include_patterns: list[str] = ["*"]
    exclude_patterns: list[str] = []

class ConfluenceConfig(SourceConfig):
    base_url: str
    space_key: str
    username: str
    api_token: str
    include_attachments: bool = False

class KubernetesConfig(SourceConfig):
    cluster_name: str
    kubeconfig: str
    namespaces: list[str]
    ingest_metadata: bool = True

class SourceCreate(BaseModel):
    type: str
    name: str
    config: Dict[str, Any]

class SourceResponse(BaseModel):
    id: UUID
    project_id: UUID
    type: str
    name: str
    status: str
    last_ingested_at: Optional[datetime]
    document_count: int
    created_at: datetime
```

---

### Chat Model
```python
class ChatMessage(BaseModel):
    project_id: UUID
    message: str
    session_id: Optional[UUID] = None
    stream: bool = False
    include_kubernetes_data: bool = False
    max_context_chunks: int = 10

class SourceCitation(BaseModel):
    source_id: UUID
    source_name: str
    source_type: str
    chunk_text: str
    relevance_score: float
    metadata: Dict[str, Any]

class ChatResponse(BaseModel):
    message_id: UUID
    response: str
    sources: list[SourceCitation]
    kubernetes_context: Optional[Dict[str, Any]]
    created_at: datetime
```

---

## 🔌 Integration Specifications

### GitHub Integration
**Library**: `PyGithub` or direct REST API  
**Authentication**: Personal Access Token (PAT)  
**Permissions Required**:
- `repo` (read access to repositories)
- `read:org` (if accessing org repos)

**Rate Limits**: 5000 requests/hour (authenticated)

---

### Confluence Integration
**Library**: `atlassian-python-api`  
**Authentication**: Basic Auth (username + API token)  
**Endpoints Used**:
- `/rest/api/content` (get pages)
- `/rest/api/content/{id}` (get page content)
- `/rest/api/content/{id}/child/attachment` (get attachments)

**Rate Limits**: Vary by instance

---

### Kubernetes Integration
**Library**: `kubernetes` (official Python client)  
**Authentication**: kubeconfig file  
**Resources Accessed**:
- Pods
- Deployments
- Services
- ConfigMaps
- Secrets (metadata only)
- Nodes
- Events

**Permissions Required**: Read-only ClusterRole

---

### Milvus Integration
**Library**: `pymilvus`  
**Connection**: gRPC (port 19530)  
**Operations**:
- Collection management
- Vector insertion
- Similarity search
- Hybrid search (vector + scalar filtering)

---

### LLM Integration

#### OpenWebUI
**Protocol**: HTTP/HTTPS  
**API Format**: OpenAI-compatible  
**Endpoint**: `/v1/chat/completions`

**Request Format:**
```json
{
  "model": "qwen3-coder-30b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": false
}
```

#### Embedding Model
**Endpoint**: `/v1/embeddings`

**Request Format:**
```json
{
  "model": "qwen3-embedding",
  "input": ["text to embed"]
}
```

---

## 🔐 Security Specifications

### Password Hashing
- **Algorithm**: bcrypt
- **Rounds**: 12

### JWT Tokens
- **Algorithm**: HS256
- **Access Token Expiry**: 1 hour
- **Refresh Token Expiry**: 7 days

### Secrets Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2
- **Storage**: Encrypted in database

### API Security
- **CORS**: Configured for specific origins
- **Rate Limiting**: Token bucket algorithm
- **Input Validation**: Pydantic models
- **SQL Injection Prevention**: ORM (SQLAlchemy)

---

## 📈 Performance Specifications

### Response Time Targets
- **API Health Check**: < 50ms
- **Project List**: < 200ms
- **RAG Query**: < 3s (including LLM)
- **Vector Search**: < 100ms
- **K8s Query**: < 500ms

### Throughput Targets
- **Concurrent Users**: 100
- **API Requests**: 1000 req/sec
- **Ingestion**: 100 docs/min
- **Vector Search**: 10 queries/sec

### Scalability
- **Horizontal Scaling**: Backend API (stateless)
- **Vertical Scaling**: Milvus (GPU for large datasets)
- **Queue Workers**: Auto-scale based on queue depth

---

## 🧪 Testing Specifications

### Unit Test Coverage
- **Target**: 80%
- **Framework**: pytest
- **Mock External Services**: Yes

### Integration Tests
- **Database**: TestContainers for PostgreSQL
- **Vector DB**: Milvus test instance
- **External APIs**: Mock responses

### E2E Tests
- **Framework**: Playwright (frontend)
- **Scenarios**: Critical user workflows
- **Frequency**: On every PR

---

## 📚 Additional Documentation References

### Framework Documentation
- [FastAPI 0.121.3 Documentation](https://fastapi.tiangolo.com/)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Pydantic 2.12.4 Documentation](https://docs.pydantic.dev/)
- [SQLAlchemy 2.0.44 Documentation](https://docs.sqlalchemy.org/)

### Database Documentation
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Milvus 2.6+ Documentation](https://milvus.io/docs)
- [Redis 7.1+ Documentation](https://redis.io/docs/)

### Integration Documentation
- [Kubernetes Python Client](https://github.com/kubernetes-client/python)
- [PyGithub Documentation](https://pygithub.readthedocs.io/)
- [OpenWebUI Documentation](https://docs.openwebui.com/)

### Python Packages
- [Uvicorn 0.38.0](https://www.uvicorn.org/)
- [Alembic 1.17.2](https://alembic.sqlalchemy.org/)
- [HTTPX 0.28.1](https://www.python-httpx.org/)
- [pymilvus 2.6.3](https://milvus.io/api-reference/pymilvus/v2.6.x/About.md)
- [redis-py 7.1.0](https://redis-py.readthedocs.io/)

---

**Document Version**: 1.1  
**Last Updated**: December 2025  
**Maintained By**: InfraMind-AI Development Team
