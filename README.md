<div align="center">

# NexaVerse

### Enterprise Knowledge Assistant — Powered by Azure AI

*Stop searching. Start asking.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Azure](https://img.shields.io/badge/Azure_AI-Powered-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## What is NexaVerse?

NexaVerse is a **production-ready Retrieval-Augmented Generation (RAG) platform** that transforms your organisation's documents into an intelligent, conversational knowledge base.

Upload PDFs, Word documents, or images — then let your team ask questions in plain English and receive accurate, **citation-backed answers streamed in real time**. Every response is grounded in your actual documents, with role-based access control ensuring the right people see the right information.

Built entirely on **Microsoft Azure AI** services with a modern **React + FastAPI** stack.

---

## Core Capabilities

| Capability | Detail |
|---|---|
| **Multi-format Ingestion** | PDF, DOCX, JPEG, PNG, TIFF — up to 50 MB per file |
| **Hybrid Search** | HNSW vector search + keyword search, fused via Reciprocal Rank Fusion |
| **Streaming Chat** | Answers stream token-by-token over SSE with inline document citations |
| **Role-Based Access** | Three-tier RBAC enforced at API, search, and document list layers |
| **Audit Trail** | Every login, upload, query, and deletion persisted to Cosmos DB |
| **Token Analytics** | Per-user consumption tracking with daily / weekly / monthly breakdowns |
| **Content Moderation** | Azure AI Content Safety scans both user inputs and model outputs |
| **Docker Ready** | Full-stack deployment in a single command |

---

## How Documents Are Ingested

The upload endpoint returns `202 Accepted` immediately. All heavy processing runs asynchronously in the background.

```
 ┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
 │  Upload API │────▶│   Azure Blob     │────▶│ Doc Intelligence   │
 │  (FastAPI)  │     │   Storage        │     │ OCR + Layout Model │
 └─────────────┘     └──────────────────┘     └────────┬───────────┘
                                                        │ text per page
                                               ┌────────▼───────────┐
                                               │  Token-aware        │
                                               │  Chunking           │
                                               │  500 tok / 50 ovlp  │
                                               └────────┬───────────┘
                                                        │ chunks
                                               ┌────────▼───────────┐
                                               │  Azure OpenAI       │
                                               │  text-embedding-    │
                                               │  3-small (batch)    │
                                               └────────┬───────────┘
                                                        │ vectors
                                               ┌────────▼───────────┐
                                               │  Azure AI Search    │
                                               │  HNSW index with    │
                                               │  RBAC role filter   │
                                               └─────────────────────┘

  Status: uploading → extracting → chunking → indexing → ready
```

Poll `GET /documents/{id}/status` to track progress.

---

## Getting Started

### Prerequisites

- Python **3.11+**
- Node.js **18+**
- An **Azure subscription** with the six services below provisioned
- Docker & Docker Compose *(for the one-command setup)*

---

### Option A — Docker Compose

The fastest path from zero to running.

```bash
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# Configure your Azure credentials
cp backend/.env.example backend/.env
# Edit backend/.env — see Environment Variables section

docker-compose up --build
```

| Service | URL |
|---|---|
| Web App | http://localhost:3000 |
| REST API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

```bash
docker-compose up -d      # detached mode
docker-compose down       # teardown
```

---

### Option B — Local Development

```bash
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# ── Backend ──────────────────────────────────────────────────────────────
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt
cp .env.example .env           # fill in your Azure credentials

uvicorn main:app --reload --host 0.0.0.0 --port 8000

# ── Frontend (open a new terminal) ───────────────────────────────────────
cd frontend
npm install
npm run dev
```

The API is live at `http://localhost:8000` and the UI at `http://localhost:5173`.

---

## Environment Variables

```bash
# ── Authentication ───────────────────────────────────────────────────────
JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Azure OpenAI ─────────────────────────────────────────────────────────
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# ── Azure AI Search ──────────────────────────────────────────────────────
AZURE_SEARCH_ENDPOINT=https://<resource>.search.windows.net
AZURE_SEARCH_API_KEY=<admin-key>
AZURE_SEARCH_INDEX_NAME=knowledge-index

# ── Azure Blob Storage ───────────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=<name>;AccountKey=<key>;...
AZURE_STORAGE_CONTAINER_NAME=documents

# ── Azure Document Intelligence ──────────────────────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<resource>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<your-key>

# ── Azure Cosmos DB ──────────────────────────────────────────────────────
AZURE_COSMOS_URL=https://<account>.documents.azure.com:443/
AZURE_COSMOS_KEY=<primary-key>
AZURE_COSMOS_DATABASE=rag-database
AZURE_COSMOS_AUDIT_CONTAINER=audit-logs
AZURE_COSMOS_TOKENS_CONTAINER=token-usage

# ── Azure Content Safety ─────────────────────────────────────────────────
AZURE_CONTENT_SAFETY_ENDPOINT=https://<resource>.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=<your-key>

# ── Application ──────────────────────────────────────────────────────────
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
TOP_K_SEARCH_RESULTS=5
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50
```

---

## Azure Service Setup

> **Note:** The Azure AI Search index and Cosmos DB database/containers are **auto-provisioned on first startup**. You do not need to create them manually.

| Service | Action Required |
|---|---|
| **Azure OpenAI** | Deploy model `gpt-4o` and `text-embedding-3-small`; copy endpoint + key |
| **Azure AI Search** | Create resource (Standard tier or above); copy endpoint + admin key |
| **Azure Blob Storage** | Create a storage account with a container named `documents`; copy connection string |
| **Azure Document Intelligence** | Create resource; copy endpoint + key |
| **Azure Cosmos DB** | Create account with NoSQL API; copy URL + primary key |
| **Azure Content Safety** | Create resource; copy endpoint + key |

To manually pre-create the search index or Cosmos DB containers:
```bash
python backend/scripts/create_search_index.py
python backend/scripts/create_cosmos_containers.py
```

---

## Demo Credentials

Three built-in accounts to explore every role immediately:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | **Admin** | Upload, delete, manage users, view all audit logs and analytics |
| `analyst` | `analyst123` | **Analyst** | Upload documents, chat, access analyst + viewer content |
| `viewer` | `viewer123` | **Viewer** | Read-only chat, viewer-permitted documents only |

> **Production note:** Replace demo accounts with Azure Entra ID (MSAL) for SSO.

---

## API Reference

Full interactive documentation is available at **`/docs`** (Swagger UI) and **`/redoc`** (ReDoc).

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate → receive JWT token |
| `GET` | `/auth/me` | Any | Current authenticated user |
| `POST` | `/documents/upload` | Analyst, Admin | Upload file and start ingestion pipeline |
| `GET` | `/documents/` | Any | List documents visible to current role |
| `GET` | `/documents/{id}/status` | Any | Poll ingestion status |
| `DELETE` | `/documents/{id}` | Admin | Remove from Blob Storage + Search index |
| `PATCH` | `/documents/{id}/category` | Admin | Update document category |
| `POST` | `/chat/stream` | Any | Real-time RAG chat via SSE |
| `GET` | `/chat/history/{session_id}` | Any | Retrieve conversation history |
| `DELETE` | `/chat/history/{session_id}` | Any | Clear a chat session |
| `GET` | `/admin/audit` | Admin | Query audit logs with filters + pagination |
| `GET` | `/admin/audit/export` | Admin | Export audit logs as CSV or JSON |
| `GET` | `/admin/usage` | Admin | All-user token consumption + cost estimates |
| `GET` | `/admin/users` | Admin | List all registered users |
| `GET` | `/usage/me` | Any | Personal token usage (daily/weekly/monthly) |
| `GET` | `/usage/me/recent-queries` | Any | Recent chat queries |

---

## Testing Ingestion

Five realistic test documents are included in `test_documents/` — ready to upload with no setup:

```
HR_Policy_2026.pdf                  ← leave, benefits, remote work
Q1_2026_Financial_Report.pdf        ← revenue, expenses, outlook
Technical_Architecture_Guide.pdf    ← system design, security model
Product_Roadmap_2026.docx           ← Q3/Q4 2026 + 2027 initiatives
Sales_Playbook_Q3_2026.docx         ← pricing, objections, case studies
```

**Quickest test path:** Open `/docs`, click **Authorize**, upload a file via `POST /documents/upload`, then ask a question via `POST /chat/stream`.

---

## Project Structure

```
NexaVerse/
├── backend/
│   ├── main.py                        # Application entry point
│   ├── config.py                      # Pydantic settings (reads .env)
│   ├── requirements.txt
│   ├── .env.example                   # ← copy to .env
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── auth.py                    # JWT creation, validation, demo users
│   │   └── rbac.py                    # Role-enforcement FastAPI dependencies
│   │
│   ├── models/
│   │   ├── user.py                    # User, Token, UserRole
│   │   ├── document.py                # DocumentMetadata, DocumentChunk, status enums
│   │   ├── chat.py                    # ChatRequest, Citation, ChatResponse
│   │   └── audit.py                   # AuditLog, TokenUsageRecord
│   │
│   ├── services/
│   │   ├── blob_service.py            # Azure Blob Storage — upload / delete
│   │   ├── document_intel.py          # Azure Document Intelligence — OCR + layout
│   │   ├── search_service.py          # Azure AI Search — index, hybrid search, delete
│   │   ├── openai_service.py          # Azure OpenAI — embeddings, streaming, RAG prompt
│   │   ├── cosmos_service.py          # Cosmos DB — audit logs, token usage
│   │   └── content_safety.py          # Azure Content Safety — moderation
│   │
│   ├── routers/
│   │   ├── auth.py                    # /auth/*
│   │   ├── documents.py               # /documents/* (full ingestion pipeline)
│   │   ├── chat.py                    # /chat/stream, /chat/history/*
│   │   ├── admin.py                   # /admin/audit, /admin/usage, /admin/users
│   │   └── usage.py                   # /usage/me
│   │
│   ├── utils/
│   │   ├── chunking.py                # tiktoken-based chunking with overlap
│   │   └── logging.py                 # Structured JSON logger
│   │
│   ├── scripts/
│   │   ├── create_search_index.py     # Manual index creation helper
│   │   └── create_cosmos_containers.py
│   │
│   └── static/                        # Compiled frontend, served by FastAPI
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx             # App shell + navigation sidebar
│       │   └── RoleRoute.tsx          # Role-gated route component
│       ├── context/
│       │   └── AuthContext.tsx        # Global JWT auth state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Chat.tsx               # Streaming RAG chat UI
│       │   ├── DocumentLibrary.tsx    # Upload, list, status polling
│       │   ├── AdminAudit.tsx         # Audit log viewer
│       │   ├── AdminUsage.tsx         # Token analytics dashboard
│       │   └── MyUsage.tsx            # Personal usage view
│       └── utils/
│           └── api.ts                 # Typed Axios client
│
├── test_documents/                    # Sample documents for ingestion testing
├── docker-compose.yml
└── README.md
```

---

<div align="center">

**NexaVerse** — Built with Azure AI · FastAPI · React

*If you find this useful, consider giving it a ⭐*

</div>
