# 🌌 NexaVerse — Enterprise Knowledge Assistant

> **Ask your documents anything.** Upload enterprise documents and get accurate, citation-backed answers through an AI-powered streaming chat interface.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Azure](https://img.shields.io/badge/Cloud-Azure%20AI-0078D4?style=flat-square&logo=microsoftazure)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)

---

## ✨ Features

- 📄 **Multi-format Document Upload** — PDF, DOCX, JPEG, PNG, TIFF
- 🔍 **Hybrid Search** — Vector + keyword search via Azure AI Search (HNSW + RRF)
- 💬 **Streaming Chat** — Real-time answers with citations over SSE
- 🔐 **Role-Based Access Control** — Admin / Analyst / Viewer with 3-layer enforcement
- 📊 **Token Usage Tracking** — Per-user analytics and cost estimates in Cosmos DB
- 🛡️ **Content Safety** — Azure AI Content Safety on both input and output
- 📝 **Full Audit Trail** — Every login, upload, query, and deletion logged to Cosmos DB
- 🐳 **Docker Ready** — One-command full-stack deployment

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐   │
│  │   Auth   │  │ Documents │  │   Chat   │  │ Admin/Usage │   │
│  │  (JWT)   │  │ Pipeline  │  │ RAG+SSE  │  │  Analytics  │   │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └──────┬──────┘   │
│       └──────────────┴─────────────┴────────────────┘          │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │                   Azure AI Services                     │   │
│  │  Blob Storage │ Doc Intelligence │ AI Search │ OpenAI   │   │
│  │  (file store) │ (OCR + extract)  │ (hybrid)  │ (GPT+EMB)│   │
│  │                              Cosmos DB (audit + tokens) │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ↑
   React 19 + Vite + TypeScript + Tailwind CSS (Frontend)
```

---

## 📥 Document Ingestion Pipeline

When a file is uploaded the API returns `202 Accepted` immediately.  
Processing continues in the **background** through these steps:

```
Upload Request
    │
    ├─ RBAC check (Viewers blocked)
    ├─ File type validation (PDF, DOCX, JPEG, PNG, TIFF)
    ├─ File size check (max 50 MB)
    │
    ▼
1. BLOB STORAGE       → raw file saved to Azure Blob Storage
    ▼
2. EXTRACT            → Azure AI Document Intelligence (prebuilt-layout)
                         extracts text line-by-line per page + tables
    ▼
3. CHUNK              → tiktoken (cl100k_base) splits into 500-token chunks
                         with 50-token overlap; page number kept on each chunk
    ▼
4. EMBED              → all chunks sent in one batch to text-embedding-3-small
                         → 1536-dim float vectors; token usage logged to Cosmos DB
    ▼
5. INDEX              → chunks + embeddings uploaded to Azure AI Search
                         in batches of 100; each chunk stores: content,
                         page_number, section, category, uploader, allowed_roles
    ▼
Status: uploading → extracting → chunking → indexing → ready
```

Poll status at `GET /documents/{id}/status`.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker & Docker Compose *(for containerised setup)*
- Azure subscription with the services below provisioned

---

### Option A — Docker Compose *(Recommended)*

```bash
# 1. Clone
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Azure credentials

# 3. Start everything
docker-compose up --build
```

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️  API | http://localhost:8000 |
| 📖 Swagger Docs | http://localhost:8000/docs |

```bash
docker-compose up --build -d   # run in background
docker-compose down            # stop
```

---

### Option B — Run Locally

```bash
# Clone
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# ── Backend ──────────────────────────────────────────────────────
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS
pip install -r requirements.txt

cp .env.example .env           # fill in Azure credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# ── Frontend (new terminal) ───────────────────────────────────────
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Backend | http://localhost:8000 |
| Frontend | http://localhost:5173 |

---

## 🔑 Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

```env
# JWT
JWT_SECRET_KEY=your-secret           # generate: python -c "import secrets; print(secrets.token_hex(32))"
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://YOUR_SEARCH.search.windows.net
AZURE_SEARCH_API_KEY=your-admin-key
AZURE_SEARCH_INDEX_NAME=knowledge-index

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=documents

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

# Azure Cosmos DB
AZURE_COSMOS_URL=https://YOUR_ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=your-primary-key
AZURE_COSMOS_DATABASE=rag-database
AZURE_COSMOS_AUDIT_CONTAINER=audit-logs
AZURE_COSMOS_TOKENS_CONTAINER=token-usage

# Azure Content Safety
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your-key

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
TOP_K_SEARCH_RESULTS=5
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50
```

---

## ☁️ Azure Service Setup

All search indexes and Cosmos DB containers are **auto-created on first startup**.

| Service | Notes |
|---|---|
| **Azure OpenAI** | Deploy `gpt-4o` (chat) + `text-embedding-3-small` (embeddings) |
| **Azure AI Search** | Standard tier recommended; index auto-created |
| **Azure Blob Storage** | Create a container named `documents` |
| **Azure Document Intelligence** | Any tier; used for OCR + layout extraction |
| **Azure Cosmos DB** | NoSQL API; DB + containers auto-created |
| **Azure Content Safety** | Used to moderate inputs and outputs |

> Optionally pre-create resources manually:
> ```bash
> python backend/scripts/create_search_index.py
> python backend/scripts/create_cosmos_containers.py
> ```

---

## 👤 Demo Accounts

| Username | Password | Role | Access |
|---|---|---|---|
| `admin` | `admin123` | **Admin** | Upload, delete, manage users, all audit logs |
| `analyst` | `analyst123` | **Analyst** | Upload, chat, analyst + viewer docs |
| `viewer` | `viewer123` | **Viewer** | Read-only chat, viewer-permitted docs only |

---

## 🧪 Testing Ingestion

Five ready-to-use test documents are in the `test_documents/` folder:

| File | Type | Topic |
|---|---|---|
| `HR_Policy_2026.pdf` | PDF | Leave policy, benefits, remote work |
| `Q1_2026_Financial_Report.pdf` | PDF | Revenue, expenses, cash position |
| `Technical_Architecture_Guide.pdf` | PDF | System design, pipeline, security |
| `Product_Roadmap_2026.docx` | DOCX | Q3/Q4 2026 features, 2027 initiatives |
| `Sales_Playbook_Q3_2026.docx` | DOCX | Pricing, objections, success stories |

**Easiest way to test:** Open **http://localhost:8000/docs** (Swagger UI), authorize with `admin / admin123`, and use `POST /documents/upload` to upload a file directly from the browser.

**Or via PowerShell:**
```powershell
# 1. Login
$res   = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
           -Method POST -ContentType "application/json" `
           -Body '{"username":"admin","password":"admin123"}'
$token = $res.access_token

# 2. Upload
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:8000/documents/upload" `
  -Method POST -Headers $headers `
  -Form @{ file = Get-Item ".\test_documents\HR_Policy_2026.pdf"; category = "hr" }

# 3. Poll status (replace <id> with document_id from previous response)
Invoke-RestMethod -Uri "http://localhost:8000/documents/<id>/status" -Headers $headers
```

---

## 📡 API Reference

> Full interactive docs → **http://localhost:8000/docs**

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login → JWT token |
| `GET` | `/auth/me` | Current user profile |

### Documents
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | analyst, admin | Upload + start ingestion pipeline |
| `GET` | `/documents/` | all | List role-filtered documents |
| `GET` | `/documents/{id}/status` | all | Poll ingestion status |
| `DELETE` | `/documents/{id}` | admin | Delete from Blob + Search index |
| `PATCH` | `/documents/{id}/category` | admin | Change category |

**Status flow:** `uploading → extracting → chunking → indexing → ready`

### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | SSE streaming RAG chat |
| `GET` | `/chat/history/{session_id}` | Conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear session |

### Admin *(admin only)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/audit` | Audit logs with filters + pagination |
| `GET` | `/admin/audit/export?format=csv` | Export as CSV or JSON |
| `GET` | `/admin/usage` | All-user token analytics + cost estimate |
| `GET` | `/admin/users` | List all users |

### Usage
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/usage/me?period=daily` | Personal token usage (daily/weekly/monthly/all-time) |
| `GET` | `/usage/me/recent-queries` | Recent chat queries |

---

## 🗂️ Project Structure

```
NexaVerse/
│
├── backend/
│   ├── main.py                        # App entry point, startup events, CORS
│   ├── config.py                      # Pydantic settings loaded from .env
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # ← copy this to .env
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── auth.py                    # JWT creation/validation + demo users
│   │   └── rbac.py                    # Role enforcement FastAPI dependencies
│   │
│   ├── models/
│   │   ├── user.py                    # User, Token, UserRole models
│   │   ├── document.py                # DocumentMetadata, DocumentChunk, status enums
│   │   ├── chat.py                    # ChatRequest, Citation, ChatResponse
│   │   └── audit.py                   # AuditLog, TokenUsageRecord
│   │
│   ├── services/
│   │   ├── blob_service.py            # Azure Blob Storage: upload / delete
│   │   ├── document_intel.py          # Azure Doc Intelligence: OCR + layout extract
│   │   ├── search_service.py          # Azure AI Search: index creation, hybrid search, delete
│   │   ├── openai_service.py          # Azure OpenAI: batch embeddings, streaming chat, RAG prompt
│   │   ├── cosmos_service.py          # Cosmos DB: audit logs, token usage read/write
│   │   └── content_safety.py          # Azure Content Safety: input/output moderation
│   │
│   ├── routers/
│   │   ├── auth.py                    # /auth/login, /auth/me
│   │   ├── documents.py               # /documents/* — full ingestion pipeline
│   │   ├── chat.py                    # /chat/stream (SSE), /chat/history/*
│   │   ├── admin.py                   # /admin/audit, /admin/usage, /admin/users
│   │   └── usage.py                   # /usage/me
│   │
│   ├── utils/
│   │   ├── chunking.py                # tiktoken-based chunking with overlap
│   │   └── logging.py                 # Structured JSON logger
│   │
│   ├── scripts/
│   │   ├── create_search_index.py     # Manually create Azure AI Search index
│   │   └── create_cosmos_containers.py # Manually create Cosmos DB containers
│   │
│   └── static/                        # Built frontend assets (served by FastAPI)
│       ├── index.html
│       └── assets/
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Router setup
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.tsx             # Sidebar navigation + shell
│   │   │   └── RoleRoute.tsx          # Role-gated route wrapper
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # JWT auth state (login, logout, user)
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.tsx              # Login page
│   │   │   ├── Chat.tsx               # Main RAG chat interface (SSE streaming)
│   │   │   ├── DocumentLibrary.tsx    # Upload, list, delete, status polling
│   │   │   ├── AdminAudit.tsx         # Audit log viewer (admin only)
│   │   │   ├── AdminUsage.tsx         # Token usage analytics (admin only)
│   │   │   └── MyUsage.tsx            # Personal usage dashboard
│   │   │
│   │   └── utils/
│   │       └── api.ts                 # Axios API client + typed request helpers
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── test_documents/                    # Ready-to-use test files for ingestion
│   ├── HR_Policy_2026.pdf
│   ├── Q1_2026_Financial_Report.pdf
│   ├── Technical_Architecture_Guide.pdf
│   ├── Product_Roadmap_2026.docx
│   ├── Sales_Playbook_Q3_2026.docx
│   └── create_test_docs.py            # Script that generated the above files
│
├── docker-compose.yml
└── README.md
```

---

<p align="center">Built with ❤️ using Azure AI + FastAPI + React</p>
