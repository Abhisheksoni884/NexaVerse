# NexaVerse — Enterprise Knowledge Assistant

A production-ready **Retrieval-Augmented Generation (RAG)** backend built with **FastAPI** and **Azure AI Services**. Employees can upload enterprise documents (PDF, DOCX, images) and ask natural language questions to get accurate, citation-backed answers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│                                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐    │
│  │  Auth   │  │Documents │  │   Chat    │  │ Admin/Usage   │    │
│  │  JWT    │  │ Pipeline │  │ RAG + SSE │  │  Analytics    │    │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └───────┬───────┘    │
│       │            │              │                │            │
│  ┌────┴────────────┴──────────────┴────────────────┴───────┐    │
│  │                    Azure Services                       │    │
│  │ Blob │ Doc Intelligence │ AI Search │ OpenAI │ Cosmos DB│    │
│  │      │                  │ (Hybrid)  │ GPT-4o │ (Audit)  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Azure Services Used

| Service | Purpose |
|---|---|
| **Azure OpenAI** (GPT-4o + text-embedding-3-small) | Chat completions + embeddings |
| **Azure AI Search** | Hybrid vector + keyword search index |
| **Azure AI Document Intelligence** | Text/table extraction from PDF, DOCX, images |
| **Azure Blob Storage** | Document file storage |
| **Azure Cosmos DB** | Audit logs + token usage tracking |
| **Azure AI Content Safety** | Input/output content moderation |

---

## Quick Start

### Prerequisites
- Python 3.11+
- All Azure resources provisioned (see [Azure Setup](#azure-resource-setup) below)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd NexaVerse/backend

# Create virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your Azure credentials
notepad .env  # or your preferred editor
```

### 3. Run the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 4. Run the Frontend (React UI)

```bash
cd ../frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**.

---

## Docker

Both the frontend and backend run together via Docker Compose.

```bash
# 1. Copy and fill in your environment variables
cp backend/.env.example backend/.env

# 2. Build and start all services
docker-compose up --build

# UI  → http://localhost:3000
# API → http://localhost:8000
# Swagger docs → http://localhost:8000/docs
```

To run in the background:
```bash
docker-compose up --build -d
```

To stop:
```bash
docker-compose down
```

---

## Azure Resource Setup

### 1. Azure OpenAI
1. Create an **Azure OpenAI** resource in the [Azure Portal](https://portal.azure.com)
2. Deploy two models:
   - **gpt-4o** (for chat completions)
   - **text-embedding-3-small** (for embeddings)
3. Copy the endpoint and API key to `.env`

### 2. Azure AI Search
1. Create an **Azure AI Search** resource (Standard tier recommended for vector search)
2. Copy the endpoint and admin API key to `.env`
3. The index is **auto-created** on first startup

### 3. Azure Blob Storage
1. Create a **Storage Account** and a container named `documents`
2. Copy the connection string to `.env`

### 4. Azure AI Document Intelligence
1. Create an **Azure AI Document Intelligence** resource
2. Copy the endpoint and key to `.env`

### 5. Azure Cosmos DB
1. Create a **Cosmos DB** account (NoSQL API)
2. The database and containers are **auto-created** on first startup
3. Copy the URL and primary key to `.env`

### 6. Azure AI Content Safety
1. Create an **Azure AI Content Safety** resource
2. Copy the endpoint and key to `.env`

---

## API Documentation

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with username/password → JWT token |
| `GET` | `/auth/me` | Get current user profile |

**Demo credentials:**
| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `analyst` | `analyst123` | Analyst |
| `viewer` | `viewer123` | Viewer |

### Documents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | analyst, admin | Upload + process a document |
| `GET` | `/documents/` | all | List accessible documents |
| `GET` | `/documents/{id}/status` | all | Poll processing status |
| `DELETE` | `/documents/{id}` | admin only | Delete document |
| `PATCH` | `/documents/{id}/category` | admin only | Change category |

**Upload pipeline status flow:**
```
uploading → extracting → chunking → indexing → ready
```

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | SSE streaming RAG chat |
| `GET` | `/chat/history/{session_id}` | Get conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear session |

**SSE Event Types:**
```json
{"type": "citations", "citations": [...]}    // Sources found
{"type": "token", "content": "..."}          // Streamed text
{"type": "done", "total_tokens": 1250}       // Completion
{"type": "error", "content": "..."}          // Error occurred
{"type": "replace", "content": "..."}        // Content safety replacement
```

### Admin (Admin role required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/audit` | Query audit logs (filters + pagination) |
| `GET` | `/admin/audit/export?format=csv` | Export as CSV or JSON |
| `GET` | `/admin/usage` | All-user token analytics + cost estimate |
| `GET` | `/admin/users` | List all users |

### Usage

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/usage/me?period=daily` | Personal token usage (daily/weekly/monthly/all-time) |
| `GET` | `/usage/me/recent-queries` | Recent chat queries |

---

## RBAC Design

Three roles with hierarchical access:

```
Admin  ──→  full access (upload, delete, change categories, see all docs, all audit logs)
 │
Analyst ──→ upload docs, see analyst + viewer docs, use chat
 │
Viewer ──→  read-only access, chat only, see viewer-permitted docs
```

**RBAC is enforced at three layers:**
1. **API level** — `require_role()` FastAPI dependencies reject unauthorized requests with `403`
2. **Search level** — `allowed_roles` filter in Azure AI Search queries (chunks never surface to unauthorized users)
3. **Document list** — In-memory store filtered by role before returning

---

## Audit Trail Design

Every significant event is logged to **Cosmos DB** (`audit-logs` container):

| Event | Logged When |
|---|---|
| `login` | User authentication (success or failure) |
| `document_upload` | File uploaded and processing started |
| `document_delete` | Admin deletes a document |
| `chat_query` | User submits a question |
| `content_safety_violation` | Input or output flagged |
| `rbac_access_denied` | User attempts unauthorized action |
| `admin_action` | Category changes, user management |

Each log entry includes: `timestamp`, `username`, `role`, `action`, `resource`, `resource_id`, `ip_address`, `session_id`, `details`, `token_usage`, `success`.

---

## Token Tracking Design

All Azure OpenAI token consumption is tracked in **Cosmos DB** (`token-usage` container):

- **Per operation**: chat completions and embedding generations
- **Time partitions**: `date_str`, `week_str`, `month_str` for fast aggregation queries
- **Partitioned by `username`** for efficient per-user queries

Users can query their own usage at `/usage/me`. Admins can see all-user analytics at `/admin/usage` including cost estimates.

---

## Project Structure

```
NexaVerse/
├── backend/
│   ├── main.py                    # App entry point
│   ├── config.py                  # Settings from env vars
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── auth.py               # JWT auth + demo users
│   │   └── rbac.py               # Role enforcement dependencies
│   │
│   ├── models/
│   │   ├── user.py               # User, Token, Role models
│   │   ├── document.py           # Document upload/status models
│   │   ├── chat.py               # Chat request/response + citations
│   │   └── audit.py              # Audit log + token usage models
│   │
│   ├── services/
│   │   ├── blob_service.py       # Azure Blob Storage
│   │   ├── document_intel.py     # Azure Document Intelligence
│   │   ├── search_service.py     # Azure AI Search (hybrid)
│   │   ├── openai_service.py     # Azure OpenAI (embed + stream)
│   │   ├── cosmos_service.py     # Cosmos DB (audit + tokens)
│   │   └── content_safety.py    # Azure Content Safety
│   │
│   ├── routers/
│   │   ├── auth.py               # /auth/*
│   │   ├── documents.py          # /documents/*
│   │   ├── chat.py               # /chat/*
│   │   ├── admin.py              # /admin/*
│   │   └── usage.py              # /usage/*
│   │
│   ├── utils/
│   │   ├── chunking.py           # Token-aware text chunking
│   │   └── logging.py            # Structured JSON logger
│   │
│   └── scripts/
│       ├── create_search_index.py
│       └── create_cosmos_containers.py
│
├── frontend/                      # React UI (Vite + Tailwind)
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── context/               # Auth context
│   │   ├── pages/                 # UI pages (Chat, Login, etc.)
│   │   └── utils/                 # Utilities
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml
└── README.md
```

---

## Development Tips

**Run with auto-reload:**
```bash
uvicorn main:app --reload
```

**Test the API with curl:**
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Upload a document
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your-document.pdf" \
  -F "category=general"

# Chat
curl -X POST http://localhost:8000/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the main topics in the uploaded documents?"}' \
  --no-buffer
```

**Pre-create Azure resources manually:**
```bash
python scripts/create_search_index.py
python scripts/create_cosmos_containers.py
```

---

## Production Considerations

- Replace demo users with **Azure Entra ID** (MSAL)
- Use **Azure Key Vault** for secrets instead of `.env`
- Persist document metadata to **Cosmos DB** (currently in-memory)
- Use **Azure Application Insights** for observability
- Add **token quotas** per user via Cosmos DB checks
- Deploy to **Azure App Service** or **AKS**
