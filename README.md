# 🚀 InfraMind-AI

A self-hosted AI engineering assistant with GitHub, Confluence, documentation, and Kubernetes integration.

## 📋 Features

- **Multi-Source Ingestion**: Connect GitHub repositories, Confluence spaces, and upload documents (PDF, Markdown, TXT, YAML, JSON, logs)
- **RAG-Powered Chat**: Ask questions about your codebase and infrastructure with grounded, accurate answers
- **Kubernetes Integration**: Real-time cluster monitoring, diagnostics, and troubleshooting
- **Vector Search**: Powered by Milvus for fast semantic search across all your documentation
- **Self-Hosted**: Complete control over your data with no external API calls (except configurable LLM)

## 🏗️ Architecture

### Backend
- **FastAPI 0.121.3**: High-performance Python web framework
- **PostgreSQL 15+**: Metadata storage
- **Milvus 2.6+**: Vector database for embeddings
- **Redis 7.1+**: Caching and task queue
- **Celery**: Background job processing
- **SQLAlchemy 2.0.44**: ORM with async support
- **Alembic 1.17.2**: Database migrations
- **Pydantic 2.12.4**: Data validation
- **Uvicorn 0.38.0**: ASGI server

### Frontend
- **Next.js 15**: React framework with App Router (latest)
- **TypeScript 5+**: Type-safe development
- **TailwindCSS 4+**: Utility-first styling
- **React Query**: Data fetching and caching
- **HTTPX 0.28.1**: Modern HTTP client for Python backend

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.13+ (Python 3.14 has compatibility issues with some packages)
- Node.js 20+
- PostgreSQL 15+ (or use Docker services)
- Redis 7.1+ (or use Docker services)
- (Optional) Kubernetes cluster for K8s integration

### 1. Clone the Repository
```bash
git clone <repository-url>
cd InfraMind-AI
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Create `backend/.env` with the following variables:

```env
# PostgreSQL Database Configuration
POSTGRES_DB=inframind-ai
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost  # Use 192.168.x.x for remote DB or localhost for local
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost  # Use 192.168.x.x for remote Redis
REDIS_PORT=6379

# Milvus Vector Database Configuration
MILVUS_HOST=localhost  # Use 192.168.x.x for remote Milvus
MILVUS_PORT=19530

# OpenWebUI / LLM Configuration
OPENWEB_API_URL=https://your-openwebui-instance.com/
OPENWEB_API_KEY=your_openwebui_api_key_here
OPENWEB_EMBEDDER_MODEL=text-embedding-qwen3-embedding-8b
OPENWEB_CHAT_MODEL=qwen/qwen3-8b

# Application Configuration
# SECRET_KEY=your-secret-key-for-jwt
# DEBUG=True
# LOG_LEVEL=INFO
```

**Frontend (`frontend/.env.local`)** (when frontend is created):
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Analytics
# NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### 3. Start Database Services (Optional - if not using external services)

```bash
cd db-services
docker-compose up -d
```

This will start:
- Milvus (port 19530) - Vector database
- MinIO (port 9000) - Object storage
- etcd (port 2379) - Distributed configuration

### 4. Start Application Services

**Start Everything (Recommended):**
```bash
./start.sh                    # Full startup with all checks
./start.sh --quick            # Quick restart (skip checks)
./start.sh --backend-only     # Backend only
./start.sh --frontend-only    # Frontend only
```

**Start Backend Only:**
```bash
cd backend
./start.sh                    # Full startup
./start.sh --quick            # Quick restart
```

**Start Frontend Only:**
```bash
cd frontend
./start.sh                    # Full startup
./start.sh --quick            # Quick restart
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/api/v1/health

### 6. Stop Services

```bash
# Stop all services
pkill -f 'uvicorn app.main:app'
pkill -f 'react-scripts start'

# Stop database services
cd db-services
docker-compose down
```

## 📚 Documentation

For detailed documentation, please refer to:

- **[Technical Specifications](docs/TECH_SPECS.md)**: API endpoints, database schemas, data models
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)**: Development roadmap and phases
- **[Project Structure](docs/PROJECT_STRUCTURE.md)**: Complete folder and file structure
- **[Progress Tracker](docs/PROGRESS_TRACKER.md)**: Current implementation status

## 🛠️ Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment (Python 3.14+)
python3.14 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v
pytest tests/ --cov=app  # With coverage

# Frontend tests (when available)
cd frontend
npm test
npm run test:e2e
```

### Code Quality

```bash
# Backend linting and formatting
cd backend
ruff check app/
black app/
mypy app/

# Frontend linting and formatting
cd frontend
npm run lint
npm run format
```

## 🚢 Deployment

### Docker Production Deployment

```bash
# Build production images
docker-compose -f docker/docker-compose.prod.yml build

# Start production services
docker-compose -f docker/docker-compose.prod.yml up -d

# Check health
curl http://localhost:8000/health
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/backend/
kubectl apply -f kubernetes/frontend/
kubectl apply -f kubernetes/milvus/

# Check deployment status
kubectl get pods -n inframind
```

## 🤝 Contributing

We welcome contributions! Please see our contribution guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the coding standards in [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Follow semantic versioning for releases

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [Next.js](https://nextjs.org/)
- Vector search powered by [Milvus](https://milvus.io/)
- LLM integration via [OpenWebUI](https://docs.openwebui.com/)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in the `docs/` folder
- Review the [TECH_SPECS.md](docs/TECH_SPECS.md) for API details

## 🗺️ Roadmap

See [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the complete development roadmap.

**Current Status**: Phase 1 - Foundation & Infrastructure Setup

---

**Maintained By**: InfraMind-AI Development Team  
**Last Updated**: November 2025

## 📦 Project Structure

```
InfraMind-AI/
├── .github/              # GitHub workflows & Copilot config
├── .vscode/              # VS Code workspace settings
├── backend/              # FastAPI backend application
│   ├── .venv/            # Python virtual environment
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Business logic
│   │   ├── services/     # External integrations
│   │   ├── models/       # Pydantic models
│   │   ├── db/           # Database layer
│   │   ├── workers/      # Celery background tasks
│   │   ├── utils/        # Utility functions
│   │   └── schemas/      # API schemas
│   ├── tests/            # Backend tests
│   ├── alembic/          # Database migrations
│   ├── requirements.txt  # Python dependencies
│   ├── .env              # Environment variables (gitignored)
│   └── Dockerfile        # Backend container
├── frontend/             # Next.js frontend (when created)
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & API client
│   │   ├── hooks/        # Custom React hooks
│   │   ├── types/        # TypeScript definitions
│   │   └── styles/       # CSS & themes
│   ├── public/           # Static assets
│   ├── tests/            # Frontend tests
│   └── package.json      # Node.js dependencies
├── db-services/          # Vector DB & storage services
│   ├── docker-compose.yml
│   └── volumes/          # Persistent data (gitignored)
├── docs/                 # Project documentation
│   ├── Idea.md
│   ├── PROJECT_STRUCTURE.md
│   ├── TECH_SPECS.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── PROGRESS_TRACKER.md
├── scripts/              # Utility scripts
└── config/               # Configuration files
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI app
│   ├── alembic/          # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities, API client
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local.example
├── docker/
│   └── milvus-standalone-docker-compose.yml
├── docs/
│   ├── IMPLEMENTATION_PLAN.md
│   ├── TECH_SPECS.md
│   └── PROJECT_STRUCTURE.md
└── docker-compose.yml
```

## 🔧 Configuration

### Environment Variables Reference

**Backend (`backend/.env`):**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_DB` | PostgreSQL database name | `inframind-ai` | ✅ Yes |
| `POSTGRES_USER` | PostgreSQL username | - | ✅ Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password | - | ✅ Yes |
| `POSTGRES_HOST` | PostgreSQL host address | `localhost` | ✅ Yes |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | ✅ Yes |
| `REDIS_HOST` | Redis host address | `localhost` | ✅ Yes |
| `REDIS_PORT` | Redis port | `6379` | ✅ Yes |
| `MILVUS_HOST` | Milvus vector DB host | `localhost` | ✅ Yes |
| `MILVUS_PORT` | Milvus port | `19530` | ✅ Yes |
| `OPENWEB_API_URL` | OpenWebUI API endpoint | - | ✅ Yes |
| `OPENWEB_API_KEY` | OpenWebUI API key | - | ✅ Yes |
| `OPENWEB_EMBEDDER_MODEL` | Embedding model name | `text-embedding-qwen3-embedding-8b` | ✅ Yes |
| `OPENWEB_CHAT_MODEL` | Chat model name | `qwen/qwen3-8b` | ✅ Yes |
| `SECRET_KEY` | JWT secret key | Auto-generated | ❌ No |
| `DEBUG` | Enable debug mode | `False` | ❌ No |
| `LOG_LEVEL` | Logging level | `INFO` | ❌ No |

**Frontend (`frontend/.env.local`):**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` | ✅ Yes |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | - | ❌ No |

### LLM Configuration

InfraMind-AI uses **OpenWebUI** exclusively for all LLM operations:

- **Chat Model**: Configured via `OPENWEB_CHAT_MODEL` environment variable
- **Embedding Model**: Configured via `OPENWEB_EMBEDDER_MODEL` environment variable
- **API Endpoint**: Set via `OPENWEB_API_URL`
- **Authentication**: Use `OPENWEB_API_KEY` for API access

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## 🐳 Docker Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## ☸️ Kubernetes Deployment

See `docs/DEPLOYMENT.md` for Kubernetes manifests and deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- Milvus for vector database capabilities
- Next.js for the frontend framework
- All open-source contributors

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for infrastructure engineers and DevOps teams**
