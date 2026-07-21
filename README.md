# 🌌 NexaVerse — Enterprise Knowledge Assistant

> Upload enterprise documents and get accurate, citation-backed answers through an AI-powered chat interface.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Azure](https://img.shields.io/badge/Cloud-Azure%20AI-0078D4?style=flat-square&logo=microsoftazure)](https://azure.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

---

## Features

- 📄 **Document Upload** — PDF, DOCX, JPEG, PNG, TIFF (up to 50 MB)
- 🔍 **Hybrid Search** — Vector + keyword via Azure AI Search (HNSW + RRF)
- 💬 **Streaming Chat** — Real-time SSE answers with inline citations
- 🔐 **Role-Based Access** — Admin / Analyst / Viewer, enforced at API + search level
- 📊 **Token Tracking** — Per-user usage and cost analytics in Cosmos DB
- 🛡️ **Content Safety** — Azure AI moderation on both inputs and outputs
- 📝 **Audit Trail** — Every action logged to Cosmos DB

---

## Ingestion Pipeline

API returns `202` immediately; processing runs as a background task.

```
Upload → Blob Storage → Doc Intelligence (OCR) → Chunk (500 tok / 50 overlap)
       → Embed (text-embedding-3-small, batch) → Index (Azure AI Search)

Status: uploading → extracting → chunking → indexing → ready
```

Poll: `GET /documents/{id}/status`

---

## Quick Start

### Prerequisites
- Python 3.11+, Node.js 18+
- Azure subscription with the 6 services below provisioned

### Option A — Docker Compose *(Recommended)*

```bash
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse
cp backend/.env.example backend/.env   # fill in Azure credentials
docker-compose up --build
```

| | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

### Option B — Local

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                   # fill in Azure credentials
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
JWT_SECRET_KEY=...                                      # python -c "import secrets; print(secrets.token_hex(32))"
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

AZURE_SEARCH_ENDPOINT=https://YOUR_SEARCH.search.windows.net
AZURE_SEARCH_API_KEY=...
AZURE_SEARCH_INDEX_NAME=knowledge-index

AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=documents

AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=...

AZURE_COSMOS_URL=https://YOUR_ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=...
AZURE_COSMOS_DATABASE=rag-database
AZURE_COSMOS_AUDIT_CONTAINER=audit-logs
AZURE_COSMOS_TOKENS_CONTAINER=token-usage

AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=...

APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50
TOP_K_SEARCH_RESULTS=5
```

---

## Azure Service Setup

Search index and Cosmos DB containers are **auto-created on first startup**.

| Service | Required action |
|---|---|
| **Azure OpenAI** | Deploy `gpt-4o` + `text-embedding-3-small`; copy endpoint + key |
| **Azure AI Search** | Create (Standard tier); copy endpoint + admin key |
| **Azure Blob Storage** | Create storage account + container named `documents` |
| **Azure Document Intelligence** | Create resource; copy endpoint + key |
| **Azure Cosmos DB** | Create NoSQL API account; copy URL + primary key |
| **Azure Content Safety** | Create resource; copy endpoint + key |

> Pre-create resources manually (optional):
> ```bash
> python backend/scripts/create_search_index.py
> python backend/scripts/create_cosmos_containers.py
> ```

---

## Demo Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Full access — upload, delete, audit, user management |
| `analyst` | `analyst123` | Upload + chat + view analyst/viewer docs |
| `viewer` | `viewer123` | Read-only chat + viewer-permitted docs |

---

## Testing Ingestion

Five test documents are ready in `test_documents/`:

```
HR_Policy_2026.pdf              Q1_2026_Financial_Report.pdf
Technical_Architecture_Guide.pdf  Product_Roadmap_2026.docx
Sales_Playbook_Q3_2026.docx
```

**Easiest:** Open http://localhost:8000/docs → Authorize → `POST /documents/upload` → pick a file.

---

## API Reference

Full interactive docs at **http://localhost:8000/docs**

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login → JWT token |
| `GET` | `/auth/me` | any | Current user |
| `POST` | `/documents/upload` | analyst+ | Upload + start ingestion |
| `GET` | `/documents/` | any | List accessible documents |
| `GET` | `/documents/{id}/status` | any | Poll ingestion status |
| `DELETE` | `/documents/{id}` | admin | Delete document |
| `PATCH` | `/documents/{id}/category` | admin | Change category |
| `POST` | `/chat/stream` | any | SSE streaming RAG chat |
| `GET` | `/chat/history/{id}` | any | Conversation history |
| `DELETE` | `/chat/history/{id}` | any | Clear session |
| `GET` | `/admin/audit` | admin | Audit logs |
| `GET` | `/admin/audit/export` | admin | Export CSV / JSON |
| `GET` | `/admin/usage` | admin | All-user token analytics |
| `GET` | `/admin/users` | admin | List users |
| `GET` | `/usage/me` | any | Personal token usage |
| `GET` | `/usage/me/recent-queries` | any | Recent queries |

---

## Project Structure

```
NexaVerse/
├── backend/
│   ├── main.py                  # Entry point, startup, CORS
│   ├── config.py                # Pydantic settings from .env
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── core/
│   │   ├── auth.py              # JWT + demo users
│   │   └── rbac.py              # Role dependencies
│   ├── models/
│   │   ├── user.py              # User, Token, UserRole
│   │   ├── document.py          # DocumentMetadata, DocumentChunk
│   │   ├── chat.py              # ChatRequest, Citation
│   │   └── audit.py             # AuditLog, TokenUsageRecord
│   ├── services/
│   │   ├── blob_service.py      # Blob upload / delete
│   │   ├── document_intel.py    # OCR + layout extraction
│   │   ├── search_service.py    # Index creation, hybrid search
│   │   ├── openai_service.py    # Embeddings, streaming chat, RAG prompt
│   │   ├── cosmos_service.py    # Audit logs, token usage
│   │   └── content_safety.py    # Input/output moderation
│   ├── routers/
│   │   ├── auth.py              # /auth/*
│   │   ├── documents.py         # /documents/*
│   │   ├── chat.py              # /chat/*
│   │   ├── admin.py             # /admin/*
│   │   └── usage.py             # /usage/*
│   ├── utils/
│   │   ├── chunking.py          # tiktoken chunking with overlap
│   │   └── logging.py           # Structured JSON logger
│   ├── scripts/
│   │   ├── create_search_index.py
│   │   └── create_cosmos_containers.py
│   └── static/                  # Built frontend (served by FastAPI)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx       # Sidebar + shell
│       │   └── RoleRoute.tsx    # Role-gated routes
│       ├── context/
│       │   └── AuthContext.tsx  # JWT auth state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Chat.tsx         # SSE streaming chat
│       │   ├── DocumentLibrary.tsx
│       │   ├── AdminAudit.tsx
│       │   ├── AdminUsage.tsx
│       │   └── MyUsage.tsx
│       └── utils/
│           └── api.ts           # Axios client + typed helpers
├── test_documents/              # Sample files for ingestion testing
├── docker-compose.yml
└── README.md
```

---

<p align="center">Built with ❤️ using Azure AI · FastAPI · React</p>
