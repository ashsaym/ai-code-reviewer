# 📂 InfraMind-AI Project Structure

## Overview
This document defines the complete folder and file structure for the InfraMind-AI platform, a self-hosted AI engineering assistant.

---

## 🗂 Root Directory Structure

```
InfraMind-AI/
├── .github/                   # GitHub Configuration
│   ├── workflows/             # CI/CD pipelines
│   │   ├── backend-ci.yml
│   │   ├── frontend-ci.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── copilot-instructions.md # GitHub Copilot guidelines
│
├── .vscode/                   # VS Code Configuration
│   ├── settings.json          # Workspace settings
│   ├── launch.json            # Debug configurations
│   ├── extensions.json        # Recommended extensions
│   └── tasks.json             # Build/run tasks
│
├── backend/                   # FastAPI Backend Service
│   ├── .venv/                 # Python virtual environment
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Configuration management
│   │   ├── dependencies.py    # Dependency injection
│   │   │
│   │   ├── api/               # API Routes
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── projects.py      # Project CRUD
│   │   │   │   ├── sources.py       # Source management
│   │   │   │   ├── ingestion.py     # Ingestion endpoints
│   │   │   │   ├── chat.py          # Chat/RAG endpoints
│   │   │   │   ├── kubernetes.py    # K8s operations
│   │   │   │   └── health.py        # Health checks
│   │   │
│   │   ├── core/              # Core Business Logic
│   │   │   ├── __init__.py
│   │   │   ├── projects.py          # Project manager
│   │   │   ├── ingestion.py         # Ingestion orchestrator
│   │   │   ├── rag.py               # RAG engine
│   │   │   ├── agent.py             # AI agent logic
│   │   │   └── kubernetes.py        # K8s client wrapper
│   │   │
│   │   ├── services/          # External Service Integrations
│   │   │   ├── __init__.py
│   │   │   ├── github.py            # GitHub API client
│   │   │   ├── confluence.py        # Confluence API client
│   │   │   ├── openwebui.py         # OpenWebUI API (chat & embeddings)
│   │   │   ├── vectordb.py          # Milvus operations
│   │   │   └── kubernetes_client.py # K8s Python client
│   │   │
│   │   ├── models/            # Pydantic Models & Schemas
│   │   │   ├── __init__.py
│   │   │   ├── project.py           # Project models
│   │   │   ├── source.py            # Source models
│   │   │   ├── ingestion.py         # Ingestion job models
│   │   │   ├── chat.py              # Chat/message models
│   │   │   └── kubernetes.py        # K8s resource models
│   │   │
│   │   ├── db/                # Database Layer
│   │   │   ├── __init__.py
│   │   │   ├── session.py           # DB session management
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   └── repositories/        # Data access layer
│   │   │       ├── __init__.py
│   │   │       ├── project_repo.py
│   │   │       ├── source_repo.py
│   │   │       └── chat_repo.py
│   │   │
│   │   ├── workers/           # Celery Background Workers
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py        # Celery configuration
│   │   │   ├── ingestion_tasks.py   # Ingestion workers
│   │   │   └── embeddings_tasks.py  # Embedding generation
│   │   │
│   │   ├── utils/             # Utility Functions
│   │   │   ├── __init__.py
│   │   │   ├── text_processing.py   # Chunking, cleaning
│   │   │   ├── file_handlers.py     # PDF, MD, TXT parsers
│   │   │   ├── encryption.py        # Token encryption
│   │   │   ├── validators.py        # Input validation
│   │   │   └── logger.py            # Logging configuration
│   │   │
│   │   └── schemas/           # API Request/Response Schemas
│   │       ├── __init__.py
│   │       ├── project_schemas.py
│   │       ├── source_schemas.py
│   │       └── chat_schemas.py
│   │
│   ├── tests/                 # Backend Tests
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── unit/
│   │   │   ├── test_ingestion.py
│   │   │   ├── test_rag.py
│   │   │   └── test_kubernetes.py
│   │   └── integration/
│   │       ├── test_api.py
│   │       └── test_vectordb.py
│   │
│   ├── alembic/               # Database Migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   │
│   ├── requirements.txt       # Python dependencies
│   ├── requirements-dev.txt   # Dev dependencies
│   ├── Dockerfile            # Backend container
│   └── pyproject.toml        # Poetry config (optional)
│
├── frontend/                  # Next.js Frontend
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── globals.css          # Global styles
│   │   │   │
│   │   │   ├── projects/            # Projects pages
│   │   │   │   ├── page.tsx         # Projects list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx     # Project detail
│   │   │   │   │   ├── sources/
│   │   │   │   │   │   └── page.tsx # Sources management
│   │   │   │   │   ├── chat/
│   │   │   │   │   │   └── page.tsx # Chat interface
│   │   │   │   │   └── kubernetes/
│   │   │   │   │       └── page.tsx # K8s explorer
│   │   │   │   └── new/
│   │   │   │       └── page.tsx     # Create project
│   │   │   │
│   │   │   ├── settings/            # Settings pages
│   │   │   │   ├── page.tsx         # General settings
│   │   │   │   └── security/
│   │   │   │       └── page.tsx     # Security settings
│   │   │   │
│   │   │   └── api/                 # API Routes (if needed)
│   │   │       └── health/
│   │   │           └── route.ts
│   │   │
│   │   ├── components/        # React Components
│   │   │   ├── ui/                  # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   └── Table.tsx
│   │   │   │
│   │   │   ├── layout/              # Layout components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   ├── projects/            # Project components
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   ├── ProjectForm.tsx
│   │   │   │   └── ProjectList.tsx
│   │   │   │
│   │   │   ├── sources/             # Source components
│   │   │   │   ├── SourceCard.tsx
│   │   │   │   ├── AddSourceModal.tsx
│   │   │   │   ├── GithubForm.tsx
│   │   │   │   ├── ConfluenceForm.tsx
│   │   │   │   └── FileUpload.tsx
│   │   │   │
│   │   │   ├── chat/                # Chat components
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── CodeBlock.tsx
│   │   │   │
│   │   │   └── kubernetes/          # K8s components
│   │   │       ├── ClusterOverview.tsx
│   │   │       ├── PodList.tsx
│   │   │       ├── PodDetails.tsx
│   │   │       └── LogViewer.tsx
│   │   │
│   │   ├── lib/               # Utilities & Helpers
│   │   │   ├── api.ts               # API client
│   │   │   ├── utils.ts             # Helper functions
│   │   │   └── constants.ts         # Constants
│   │   │
│   │   ├── hooks/             # Custom React Hooks
│   │   │   ├── useProjects.ts
│   │   │   ├── useSources.ts
│   │   │   ├── useChat.ts
│   │   │   └── useKubernetes.ts
│   │   │
│   │   ├── types/             # TypeScript Types
│   │   │   ├── project.ts
│   │   │   ├── source.ts
│   │   │   ├── chat.ts
│   │   │   └── kubernetes.ts
│   │   │
│   │   └── styles/            # Additional Styles
│   │       └── themes.ts
│   │
│   ├── public/                # Static Assets
│   │   ├── favicon.ico
│   │   └── images/
│   │
│   ├── tests/                 # Frontend Tests
│   │   ├── components/
│   │   └── pages/
│   │
│   ├── .eslintrc.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── db-services/               # Database Services (Docker Compose)
│   ├── docker-compose.yml         # Milvus, MinIO, etcd compose
│   ├── volumes/                   # Persistent data volumes
│   │   ├── etcd/                  # etcd data
│   │   ├── milvus/                # Milvus vector data
│   │   └── minio/                 # MinIO object storage
│   └── README.md                  # Setup instructions
│
├── docker/                    # Docker Configurations
│   ├── docker-compose.dev.yml     # Full dev environment
│   ├── docker-compose.prod.yml    # Production compose
│   ├── docker-compose.override.yml # Local overrides
│   ├── redis/
│   │   └── redis.conf
│   ├── postgres/
│   │   └── init.sql
│   └── nginx/
│       ├── nginx.conf             # Reverse proxy config
│       └── ssl/                   # SSL certificates
│
├── kubernetes/                # Kubernetes Manifests
│   ├── namespace.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   ├── milvus/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── workers/
│       ├── deployment.yaml
│       └── configmap.yaml
│
├── scripts/                   # Utility Scripts
│   ├── init_db.py                   # Initialize database
│   ├── create_admin.py              # Create admin user
│   ├── test_connections.py          # Test external services
│   ├── backup_milvus.sh             # Backup vectors
│   └── deploy.sh                    # Deployment script
│
├── docs/                      # Documentation
│   ├── Idea.md                      # Project ideation & concept
│   ├── PROJECT_STRUCTURE.md         # This file - folder structure
│   ├── TECH_SPECS.md                # Technical specifications & API
│   ├── IMPLEMENTATION_PLAN.md       # Development roadmap
│   ├── PROGRESS_TRACKER.md          # Progress tracking
│   ├── DEPLOYMENT.md                # Deployment guide (TBD)
│   ├── DEVELOPMENT.md               # Development setup (TBD)
│   ├── ARCHITECTURE.md              # System architecture (TBD)
│   └── USER_GUIDE.md                # User manual (TBD)
│
├── scripts/                   # Utility Scripts
│   ├── init_db.py                   # Initialize database
│   ├── create_admin.py              # Create admin user
│   ├── test_connections.py          # Test external services
│   ├── backup_milvus.sh             # Backup vectors
│   ├── migrate.sh                   # Migration helper
│   └── deploy.sh                    # Deployment script
│
├── config/                    # Configuration Files
│   ├── logging.yaml                 # Logging configuration
│   ├── dev.yaml                     # Dev environment config
│   ├── prod.yaml                    # Prod environment config
│   └── kubeconfig-example.yaml      # Sample kubeconfig
│
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── .dockerignore              # Docker ignore rules
├── .python-version            # Python version file
├── README.md                  # Project README
├── LICENSE                    # Project license
└── CONTRIBUTING.md            # Contribution guidelines (TBD)
```

---

## 📦 Key Components Description

### Backend (`/backend`)
- **FastAPI Application**: REST API server with async support
- **Core Logic**: Business logic for projects, ingestion, RAG, and agents
- **Services**: Integration layers for GitHub, Confluence, Milvus, K8s, OpenWebUI
- **Workers**: Celery tasks for background processing
- **Database**: PostgreSQL with SQLAlchemy ORM

### Frontend (`/frontend`)
- **Next.js 14+**: App Router with React Server Components
- **TailwindCSS**: Utility-first styling
- **React Query**: Data fetching and caching
- **TypeScript**: Type-safe development

### Docker (`/docker`)
- **Development**: Docker Compose for local development
- **Production**: Optimized production containers
- **Services**: Milvus, Redis, PostgreSQL, nginx

### Kubernetes (`/kubernetes`)
- **Manifests**: Declarative K8s resources
- **Stateful**: StatefulSets for databases
- **Config**: ConfigMaps and Secrets management

### Scripts (`/scripts`)
- **Initialization**: Database setup and migrations
- **Testing**: Connection and integration tests
- **Deployment**: Automated deployment workflows
- **Backup**: Data backup and recovery

---

## 🔧 Technology Stack

### Backend
- Python 3.14.0 (released Oct 7, 2025)
- FastAPI 0.121.3 (released Nov 19, 2025)
- Uvicorn 0.38.0 (released Oct 18, 2025)
- SQLAlchemy 2.0.44 (released Oct 10, 2025)
- Alembic 1.17.2 (released Nov 14, 2025)
- Pydantic 2.12.4 (released Nov 5, 2025)
- Celery + Redis 7.1.0 (released Nov 19, 2025)
- Kubernetes Python Client (latest)
- PyMilvus 2.6.3 (released Oct 31, 2025)
- HTTPX 0.28.1 (released Dec 6, 2024)
- psycopg2 2.9.11 (released Oct 10, 2025)

### Frontend
- Next.js 15 (latest - released 2025)
- React 19+ (bundled with Next.js 15)
- TypeScript 5+
- TailwindCSS 4+
- React Query (latest)
- Modern HTTP client integration

### Databases
- PostgreSQL 15+ (metadata)
- Milvus 2.6+ (vectors)
- Redis 7.1+ (cache/queue)

### Infrastructure
- Docker & Docker Compose (latest)
- Kubernetes (K3s/RKE2 latest)
- nginx (reverse proxy latest)

### AI/ML
- OpenWebUI API (exclusive provider for chat & embeddings)
  - Chat models: Configurable via OpenWebUI instance
  - Embedding models: Configurable via OpenWebUI instance
  - All AI features accessed through OpenWebUI API

---

## 🔐 Security Considerations

### Secrets Management
- Environment variables for sensitive data
- Encrypted tokens in database
- Kubernetes Secrets for production
- No hardcoded credentials

### Network Security
- Internal network only (no external calls)
- HTTPS/TLS in production
- RBAC for K8s access
- API authentication/authorization

### Data Isolation
- Per-project Milvus collections
- Separate kubeconfig per project
- User/role-based access control

---

## 🎯 Next Steps

1. Set up backend skeleton with FastAPI
2. Configure Milvus and database connections
3. Implement core ingestion pipeline
4. Build Next.js frontend structure
5. Create Docker Compose development environment
6. Implement RAG engine
7. Add Kubernetes integration
8. Build chat interface
9. Deploy to production infrastructure

---

**Document Version**: 1.0  
**Last Updated**: November 21, 2025
