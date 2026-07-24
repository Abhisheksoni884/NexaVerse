<div align="center">

# NexaVerse
### Enterprise RAG Platform · Azure AI-Powered

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Azure AI](https://img.shields.io/badge/Azure_AI-Powered-0078D4?style=flat-square&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

**Production-ready RAG (Retrieval-Augmented Generation) platform for enterprise knowledge management.**  
Upload documents (PDF/DOCX/Images) → Get AI-powered answers with citations.

[Setup Guide](#quick-start) • [API Docs](http://localhost:8000/docs) • [Project Structure](#project-structure)

</div>

---

## ✨ Key Features

- **Streaming RAG Chat** — Real-time SSE responses with GPT-5 reasoning model
- **Multi-format Documents** — PDF, DOCX, images via Azure Document Intelligence
- **Role-Based Access Control** — Admin, Analyst, Viewer with document-level RBAC
- **Hybrid Search** — Vector (HNSW) + keyword (BM25) with reciprocal rank fusion
- **Response Caching** — LRU cache returns identical queries in <100ms
- **Usage Analytics** — Token tracking, audit logs, cost estimation
- **Content Moderation** — Input/output safety checks via Azure Content Safety

---

## Prerequisites

**Required:**
- Python 3.11+ & Node.js 18+
- Git

**Azure Services** (set up via Azure Portal):
- Azure OpenAI (GPT-5 + text-embedding-3-small deployment)
- Azure AI Search (Standard tier recommended for vector search)
- Azure Blob Storage
- Azure Document Intelligence
- Azure Cosmos DB (NoSQL API)
- Azure Content Safety

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse
```

### 2. Configure Environment

```bash
# Copy configuration template
cp backend/.env.example backend/.env

# Edit .env with your Azure credentials
nano backend/.env  # or use your preferred editor
```

**Required credentials in `.env`:**
```env
JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key>
AZURE_SEARCH_ENDPOINT=https://<resource>.search.windows.net
AZURE_SEARCH_API_KEY=<your-key>
# ... (see .env.example for complete list)
```

### 3. Run Application

**Option A: Docker (Recommended)**
```bash
docker-compose up --build
```

**Option B: Local Development**

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (new terminal):
```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

---

## Demo Credentials

Login with these demo accounts (development only):

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `admin` | `admin123` | Admin | Full access |
| `analyst` | `analyst123` | Analyst | Upload + chat |
| `viewer` | `viewer123` | Viewer | Read-only |

> **For production:** Replace with Azure Entra ID or your SSO provider

---

## API Endpoints

**Full interactive API documentation:** http://localhost:8000/docs

**Core Endpoints:**
```
POST   /auth/login                    # User login
GET    /documents/                    # List documents
POST   /documents/upload              # Upload & process document
GET    /chat/stream?message=...       # RAG chat (Server-Sent Events)
GET    /admin/audit                   # Audit logs (admin only)
```

See Swagger UI for complete API reference.

---

## Project Architecture

```
backend/                    # Python FastAPI backend
├── main.py               # Application entry point
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
├── core/                 # Authentication & RBAC
├── models/               # Data models
├── services/             # Azure service integrations
├── routers/              # API endpoints
└── scripts/              # Utility scripts

frontend/                  # React 19 frontend
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/            # Page routes
│   ├── context/          # Auth state management
│   └── utils/            # API client & utilities
└── package.json          # Node dependencies
```

---

## Configuration Reference

**Performance Tuning** (in `.env`):
```env
LLM_MAX_COMPLETION_TOKENS=2048           # Response length (default: 2048)
LLM_REQUEST_TIMEOUT_SECONDS=30           # Request timeout (default: 30s)
TOP_K_SEARCH_RESULTS=5                   # Search results (default: 5)
```

**Advanced** (rarely changed):
```env
MAX_CHUNK_TOKENS=500                     # Document chunk size
CHUNK_OVERLAP_TOKENS=50                  # Chunk overlap for context
MAX_FILE_SIZE_MB=50                      # Max upload size
```

See `backend/.env.example` for complete configuration options.

---

## Troubleshooting

**Problem: "Search index not found"**
```bash
python backend/scripts/create_search_index.py
```

**Problem: "Cosmos containers not found"**
```bash
python backend/scripts/create_cosmos_containers.py
```

**Problem: Clear all data (development only)**
```bash
cd backend
python scripts/cleanup_data.py
```

**Problem: Check logs**
```bash
# Application logs
docker-compose logs -f backend

# Role-based logs
tail -f backend/logs/$(date +%Y-%m-%d)/*.log
```

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| First query | 6-10s | LLM processing time |
| Cached query | <100ms | LRU response cache hit |
| Document upload | 30-60s | Depends on file size |
| Embedding generation | 2-3s | Cached for identical queries |

---

## Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following existing code structure
3. Test locally: `docker-compose up --build`
4. Commit: `git commit -m "feat: description of change"`
5. Push & create Pull Request

### Code Structure
- Backend uses FastAPI with async/await patterns
- Frontend uses React with TypeScript
- All API responses use Server-Sent Events for streaming
- Caching implemented for embeddings and full responses

---

## Deployment

### Docker Production
```bash
docker build -t nexaverse:latest .
docker run -p 8000:8000 --env-file .env nexaverse:latest
```

### Azure Container Apps
```bash
az containerapp up \
  --name nexaverse \
  --resource-group <resource-group> \
  --environment <environment>
```

---

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Questions?** [Open an issue](https://github.com/Abhisheksoni884/NexaVerse/issues)  
**Like it?** [Star the repo ⭐](https://github.com/Abhisheksoni884/NexaVerse)

</div>