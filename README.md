<div align="center">

# NexaVerse
### Enterprise Knowledge Assistant · Powered by Azure AI

*Stop searching. Start asking.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Azure AI](https://img.shields.io/badge/Azure_AI-Powered-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

</div>

---

NexaVerse is a **production-ready RAG (Retrieval-Augmented Generation) platform** built on Azure AI. Upload enterprise documents — PDF, DOCX, or images — and get accurate, citation-backed answers streamed in real time through a clean chat interface.

Built with **FastAPI + React 19 + Azure AI Services** (OpenAI GPT-5, AI Search, Document Intelligence, Cosmos DB, Blob Storage, Content Safety).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Azure Setup](#azure-setup)
- [Demo Accounts](#demo-accounts)
- [Testing Ingestion](#testing-ingestion)
- [Data Cleanup](#data-cleanup)
- [Performance Optimizations](#performance-optimizations)
- [API Reference](#api-reference)
- [How Ingestion Works](#how-ingestion-works)
- [Project Structure](#project-structure)

---

## Prerequisites

Before you start, make sure you have:

- **Python 3.11+** — [Download](https://python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Docker + Docker Compose** — only needed for Option A
- **Azure subscription** with 6 services provisioned — see [Azure Setup](#azure-setup)

> **Important:** You must provision all six Azure services and fill in `backend/.env` before the app will start. Missing env vars cause a startup crash by design.

---

## Quick Start

### Option A — Docker Compose *(Recommended)*

```bash
# 1. Clone the repo
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# 2. Set up environment (fill in your Azure credentials)
cp backend/.env.example backend/.env
#    → edit backend/.env now before continuing

# 3. Build and run
docker-compose up --build
```

| | URL |
|---|---|
| Web App | http://localhost:3000 |
| REST API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

```bash
docker-compose up -d     # run in background
docker-compose down      # stop and remove containers
```

---

### Option B — Run Locally

**Backend:**

```bash
cd backend

# Create virtualenv
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env         # edit .env with your Azure credentials

# Run
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** *(open a new terminal):*

```bash
cd frontend
npm install
npm run dev
```

| | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| UI | http://localhost:5173 |

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in every value.  
The app will **refuse to start** if any required field is missing.

```env
# ── JWT ──────────────────────────────────────────────────────────────────────
# Generate a secret: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Azure OpenAI ─────────────────────────────────────────────────────────────
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5                      # your deployed model name
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# ── Azure AI Search ──────────────────────────────────────────────────────────
AZURE_SEARCH_ENDPOINT=https://YOUR-SEARCH.search.windows.net
AZURE_SEARCH_API_KEY=your-search-admin-key
AZURE_SEARCH_INDEX_NAME=knowledge-index                 # auto-created on startup

# ── Azure Blob Storage ───────────────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=documents

# ── Azure Document Intelligence ──────────────────────────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR-RESOURCE.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-doc-intel-key

# ── Azure Cosmos DB ──────────────────────────────────────────────────────────
AZURE_COSMOS_URL=https://YOUR-ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-primary-key
AZURE_COSMOS_DATABASE=rag-database                      # auto-created on startup
AZURE_COSMOS_AUDIT_CONTAINER=audit-logs                 # auto-created on startup
AZURE_COSMOS_TOKENS_CONTAINER=token-usage               # auto-created on startup

# ── Azure Content Safety ─────────────────────────────────────────────────────
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR-RESOURCE.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your-content-safety-key

# ── App Settings ─────────────────────────────────────────────────────────────
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
TOP_K_SEARCH_RESULTS=5
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50

# ── LLM Performance Tuning ────────────────────────────────────────────────────
LLM_MAX_COMPLETION_TOKENS=2048
LLM_REQUEST_TIMEOUT_SECONDS=30
RAG_CHUNK_PREVIEW_CHARS=500
```

---

## Azure Setup

> ✅ **AI Search index** and **Cosmos DB containers** are created automatically on first startup.  
> ✅ **Blob container** is used as-is — just make sure it exists.

| Service | What to do |
|---|---|
| **Azure OpenAI** | Create resource → deploy `gpt-5` (chat) and `text-embedding-3-small` (embeddings) → copy endpoint + key |
| **Azure AI Search** | Create resource (Standard tier recommended for vector search) → copy endpoint + admin key |
| **Azure Blob Storage** | Create storage account → create a container named `documents` → copy connection string |
| **Azure Document Intelligence** | Create resource → copy endpoint + key |
| **Azure Cosmos DB** | Create account (NoSQL API) → copy URL + primary key |
| **Azure Content Safety** | Create resource → copy endpoint + key |

> **Tip:** To pre-create the search index or Cosmos DB containers manually:
> ```bash
> python backend/scripts/create_search_index.py
> python backend/scripts/create_cosmos_containers.py
> ```

---

## Demo Accounts

Three built-in accounts let you explore all roles immediately:

| Username | Password | Role | What they can do |
|---|---|---|---|
| `admin` | `admin123` | **Admin** | Everything — upload, delete, audit logs, user analytics |
| `analyst` | `analyst123` | **Analyst** | Upload documents, chat, view analyst + viewer content |
| `viewer` | `viewer123` | **Viewer** | Chat only, read-only access to viewer-permitted docs |

> **For production:** Replace these with Azure Entra ID (MSAL) / SSO.

---

## Testing Ingestion

Five realistic test documents are in `test_documents/` — no setup needed:

| File | Type | Content |
|---|---|---|
| `HR_Policy_2026.pdf` | PDF | Leave policy, benefits, remote work rules |
| `Q1_2026_Financial_Report.pdf` | PDF | Revenue breakdown, expenses, outlook |
| `Technical_Architecture_Guide.pdf` | PDF | System design, security, pipeline details |
| `Product_Roadmap_2026.docx` | DOCX | Q3/Q4 2026 features, 2027 initiatives |
| `Sales_Playbook_Q3_2026.docx` | DOCX | Pricing plans, objections, case studies |

**Fastest path:**
1. Open `http://localhost:8000/docs`
2. Click **Authorize** → enter `admin` / `admin123`
3. Call `POST /documents/upload` → attach any file from `test_documents/`
4. Call `GET /documents/{id}/status` to watch progress
5. Call `POST /chat/stream` → ask a question about the document

---

## Data Cleanup

To clear all vector data, documents, and metadata for a fresh start:

```bash
cd backend
.\venv\Scripts\Activate.ps1    # Windows
source venv/bin/activate       # macOS / Linux

python scripts/cleanup_data.py
```

The script will:
- Delete and recreate the **Azure AI Search index** (empty vector database)
- Clear all files from **Azure Blob Storage**
- Delete all metadata from **Azure Cosmos DB documents container**

⚠️ **Warning:** This is irreversible. Only run in development/testing.

> See `backend/scripts/README_CLEANUP.md` for detailed usage instructions.

---

## Performance Optimizations

NexaVerse includes several performance tuning features:

### LLM Response Tuning
Configure response generation speed in `backend/.env`:

```env
# Reduce token limit for faster responses (default: 2048)
LLM_MAX_COMPLETION_TOKENS=2048

# Request timeout in seconds (default: 30)
LLM_REQUEST_TIMEOUT_SECONDS=30

# Context chunk size preview in characters (default: 500)
RAG_CHUNK_PREVIEW_CHARS=500
```

**Impact:**
- Reduced `max_completion_tokens` from 4096 → 2048 saves **2-4 seconds per request**
- Optimized RAG prompt reduces token count by **30-40%**
- Typical response time: **6-10 seconds** (GPT-5 reasoning model baseline)

### Embedding Cache
Query embeddings are cached in-memory (LRU, 512 entries, 1-hour TTL). Repeated/similar questions skip the Azure OpenAI round-trip entirely.

### Parallel Processing
Content safety checks and embedding generation run concurrently via `asyncio.gather()`, saving ~300-500ms per request.

### Fire-and-Forget Background Tasks
Audit logs and token usage writes happen after the SSE "done" event is sent to clients, improving perceived response time by ~100-300ms.

> See `backend/PERFORMANCE_IMPROVEMENTS.md` for detailed analysis and tuning guide.

---

> Full interactive docs at `http://localhost:8000/docs` (Swagger) and `/redoc` (ReDoc)

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with `username` + `password` → returns `access_token` |
| `GET` | `/auth/me` | Returns current authenticated user profile |

### Documents
| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | analyst, admin | Upload file → triggers ingestion pipeline |
| `GET` | `/documents/` | any | List documents accessible to current role |
| `GET` | `/documents/{id}/status` | any | Poll processing status |
| `DELETE` | `/documents/{id}` | admin | Delete from Blob + Search index |
| `PATCH` | `/documents/{id}/category` | admin | Change document category |

**Ingestion status flow:** `uploading → extracting → chunking → indexing → ready`

### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | Real-time SSE RAG chat — streams tokens + citations |
| `GET` | `/chat/history/{session_id}` | Get conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear a session |

### Admin *(admin role required)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/audit` | Query audit logs with filters and pagination |
| `GET` | `/admin/audit/export?format=csv` | Export audit logs as CSV or JSON |
| `GET` | `/admin/usage` | All-user token consumption + estimated cost |
| `GET` | `/admin/users` | List all registered users |

### Usage
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/usage/me?period=daily` | Personal token usage — `daily`, `weekly`, `monthly`, `all-time` |
| `GET` | `/usage/me/recent-queries` | Last N chat queries |

---

## How Ingestion Works

Upload returns `202` immediately. Processing runs as a **FastAPI background task**:

```
POST /documents/upload
  │
  ├─ Validate (role, file type, file size)
  ├─ Upload raw file → Azure Blob Storage
  │
  └─ Background task starts:
       │
       ├─ [extracting]  Azure Document Intelligence (prebuilt-layout)
       │                Extracts text line-by-line per page + tables
       │
       ├─ [chunking]    tiktoken (cl100k_base) splits text into
       │                500-token chunks with 50-token overlap.
       │                Page number, section heading, category,
       │                uploader, and allowed_roles stored per chunk.
       │
       ├─ [indexing]    All chunks embedded in one batch call →
       │                text-embedding-3-small (1536-dim vectors).
       │                Chunks + embeddings uploaded to Azure AI Search
       │                in batches of 100.
       │
       └─ [ready]       Document searchable. Token usage logged to Cosmos DB.
```

At query time, the user's question is embedded and run as a **hybrid search** (vector HNSW + keyword BM25, fused via RRF) with an RBAC filter — so users only ever retrieve chunks their role is permitted to see.

---

## Project Structure

```
NexaVerse/
│
├── backend/
│   ├── main.py                        # Entry point — CORS, routers, startup events
│   ├── config.py                      # Pydantic settings loaded from .env
│   ├── requirements.txt
│   ├── .env.example                   # ← copy this to .env
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── auth.py                    # JWT issue/verify + demo user store
│   │   └── rbac.py                    # require_role() FastAPI dependency
│   │
│   ├── models/
│   │   ├── user.py                    # User, Token, UserRole
│   │   ├── document.py                # DocumentMetadata, DocumentChunk, status enums
│   │   ├── chat.py                    # ChatRequest, Citation, ChatResponse
│   │   └── audit.py                   # AuditLog, TokenUsageRecord
│   │
│   ├── services/
│   │   ├── blob_service.py            # Blob upload / delete
│   │   ├── document_intel.py          # OCR + per-page text extraction
│   │   ├── search_service.py          # Index creation, hybrid search, chunk delete
│   │   ├── openai_service.py          # Batch embeddings, SSE streaming, RAG prompt builder
│   │   ├── cosmos_service.py          # Audit log + token usage read/write
│   │   └── content_safety.py          # Input/output moderation
│   │
│   ├── routers/
│   │   ├── auth.py                    # /auth/login, /auth/me
│   │   ├── documents.py               # /documents/* — ingestion pipeline lives here
│   │   ├── chat.py                    # /chat/stream (SSE), /chat/history/*
│   │   ├── admin.py                   # /admin/audit, /admin/usage, /admin/users
│   │   └── usage.py                   # /usage/me, /usage/me/recent-queries
│   │
│   ├── utils/
│   │   ├── chunking.py                # Token-aware chunking with overlap
│   │   └── logging.py                 # Structured JSON logger
│   │
│   ├── scripts/
│   │   ├── create_search_index.py     # One-time: create AI Search index manually
│   │   └── create_cosmos_containers.py # One-time: create Cosmos DB containers manually
│   │
│   └── static/                        # Compiled frontend assets served by FastAPI
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx             # App shell + sidebar navigation
│       │   └── RoleRoute.tsx          # Redirects unauthorized roles
│       ├── context/
│       │   └── AuthContext.tsx        # JWT login / logout / user state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Chat.tsx               # SSE streaming chat with citations
│       │   ├── DocumentLibrary.tsx    # Upload + status polling + file list
│       │   ├── AdminAudit.tsx         # Audit log table with filters
│       │   ├── AdminUsage.tsx         # Token analytics dashboard
│       │   └── MyUsage.tsx            # Personal usage view
│       └── utils/
│           └── api.ts                 # Typed Axios client for all endpoints
│
├── test_documents/                    # Ready-to-use sample files
│   ├── HR_Policy_2026.pdf
│   ├── Q1_2026_Financial_Report.pdf
│   ├── Technical_Architecture_Guide.pdf
│   ├── Product_Roadmap_2026.docx
│   ├── Sales_Playbook_Q3_2026.docx
│   └── create_test_docs.py            # Script used to generate the above
│
├── docker-compose.yml
└── README.md
```

---

<div align="center">

**NexaVerse** — Azure AI · FastAPI · React 19

*If this helped you, a ⭐ goes a long way.*

</div>
