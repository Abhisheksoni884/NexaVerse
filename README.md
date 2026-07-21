# 🌌 NexaVerse — Enterprise Knowledge Assistant

> **Ask your documents anything.** NexaVerse is a production-ready AI-powered knowledge assistant that lets your team upload enterprise documents and instantly get accurate, citation-backed answers through a sleek chat interface.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Azure](https://img.shields.io/badge/Cloud-Azure%20AI-0078D4?style=flat-square&logo=microsoftazure)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)

---

## ✨ What is NexaVerse?

NexaVerse is a **Retrieval-Augmented Generation (RAG)** system that combines the power of Azure AI services with a beautiful, responsive UI. Upload PDFs, Word documents, or images — then ask questions in plain English and get smart, sourced answers streamed back in real time.

### 🎯 Key Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Document Upload** | Supports PDF, DOCX, and images |
| 🔍 **Hybrid Search** | Combines vector + keyword search for best results |
| 💬 **Streaming Chat** | Real-time SSE streaming answers with citations |
| 🔐 **Role-Based Access** | Admin / Analyst / Viewer roles with fine-grained control |
| 📊 **Token Usage Tracking** | Per-user analytics and cost estimates |
| 🛡️ **Content Safety** | AI-powered input/output moderation |
| 📝 **Full Audit Trail** | Every action logged to Cosmos DB |
| 🐳 **Docker Ready** | One-command deployment with Docker Compose |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│                                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │  Auth   │  │Documents │  │   Chat    │  │ Admin/Usage   │  │
│  │  JWT    │  │ Pipeline │  │ RAG + SSE │  │  Analytics    │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └───────┬───────┘  │
│       │            │              │                │            │
│  ┌────┴────────────┴──────────────┴────────────────┴───────┐   │
│  │                    Azure AI Services                    │   │
│  │ Blob │ Doc Intelligence │ AI Search │ OpenAI │ Cosmos DB │   │
│  │      │                  │ (Hybrid)  │ GPT-4o │ (Audit)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ↑
   React + Vite Frontend (TypeScript + Tailwind CSS)
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, make sure you have the following:

- **Python 3.11+**
- **Node.js 18+** and npm
- **Docker & Docker Compose** *(optional, for containerized deployment)*
- **Azure Subscription** with the following services provisioned (see [Azure Setup](#-azure-service-setup) below)

---

### Option A — Run with Docker Compose *(Recommended)*

The fastest way to get up and running:

```bash
# 1. Clone the repository
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# 2. Copy and fill in your environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your Azure credentials (see Environment Variables section)

# 3. Build and start all services
docker-compose up --build
```

| Service | URL |
|---|---|
| 🌐 Frontend UI | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8000 |
| 📖 Swagger Docs | http://localhost:8000/docs |

```bash
# Run in background
docker-compose up --build -d

# Stop all services
docker-compose down
```

---

### Option B — Run Locally (Manual Setup)

#### 1. Clone the Repository

```bash
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse
```

#### 2. Set Up the Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Configure Environment Variables

```bash
# Copy the template
cp .env.example .env

# Open and fill in your Azure credentials
notepad .env   # Windows
# OR
nano .env      # Linux/macOS
```

#### 4. Start the Backend Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now live at **http://localhost:8000**

#### 5. Set Up and Start the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend is now live at **http://localhost:5173**

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the following values:

```env
# ── JWT Auth ──────────────────────────────────────────────────────
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Azure OpenAI ──────────────────────────────────────────────────
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# ── Azure AI Search ───────────────────────────────────────────────
AZURE_SEARCH_ENDPOINT=https://YOUR_SEARCH.search.windows.net
AZURE_SEARCH_API_KEY=your-azure-search-admin-key
AZURE_SEARCH_INDEX_NAME=knowledge-index

# ── Azure Blob Storage ────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=documents

# ── Azure Document Intelligence ───────────────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-doc-intelligence-key

# ── Azure Cosmos DB ───────────────────────────────────────────────
AZURE_COSMOS_URL=https://YOUR_ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-primary-key
AZURE_COSMOS_DATABASE=rag-database
AZURE_COSMOS_AUDIT_CONTAINER=audit-logs
AZURE_COSMOS_TOKENS_CONTAINER=token-usage

# ── Azure Content Safety ──────────────────────────────────────────
AZURE_CONTENT_SAFETY_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your-content-safety-key

# ── App Settings ──────────────────────────────────────────────────
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_FILE_SIZE_MB=50
TOP_K_SEARCH_RESULTS=5
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50
```

---

## ☁️ Azure Service Setup

You need to provision the following Azure services. All indexes and database containers are **auto-created on first startup**.

### 1. Azure OpenAI
1. Create an **Azure OpenAI** resource in the [Azure Portal](https://portal.azure.com)
2. Deploy these two models:
   - `gpt-4o` → for chat completions
   - `text-embedding-3-small` → for vector embeddings
3. Copy the **Endpoint** and **API Key** to `.env`

### 2. Azure AI Search
1. Create an **Azure AI Search** resource *(Standard tier recommended)*
2. Copy the **Endpoint** and **Admin API Key** to `.env`
3. ✅ The search index is **auto-created on first startup**

### 3. Azure Blob Storage
1. Create a **Storage Account** with a container named `documents`
2. Copy the **Connection String** to `.env`

### 4. Azure AI Document Intelligence
1. Create an **Azure AI Document Intelligence** resource
2. Copy the **Endpoint** and **Key** to `.env`

### 5. Azure Cosmos DB
1. Create a **Cosmos DB** account using the **NoSQL API**
2. Copy the **URL** and **Primary Key** to `.env`
3. ✅ Database and containers are **auto-created on first startup**

### 6. Azure AI Content Safety
1. Create an **Azure AI Content Safety** resource
2. Copy the **Endpoint** and **Key** to `.env`

> **Tip:** You can optionally pre-create Azure Search and Cosmos DB resources manually using the helper scripts:
> ```bash
> python backend/scripts/create_search_index.py
> python backend/scripts/create_cosmos_containers.py
> ```

---

## 👤 Demo User Accounts

The system comes with three built-in demo users to get you started immediately:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | **Admin** | Full access — upload, delete, manage users, view all audit logs |
| `analyst` | `analyst123` | **Analyst** | Upload docs, chat, view analyst + viewer docs |
| `viewer` | `viewer123` | **Viewer** | Read-only chat, view viewer-permitted docs only |

> ⚠️ **Production Note:** Replace these demo users with **Azure Entra ID (MSAL)** for real deployments.

---

## 🛡️ Role-Based Access Control (RBAC)

```
Admin  ──→  full access (upload, delete, categories, all users, all audit logs)
 │
Analyst ──→ upload docs, use chat, see analyst + viewer docs
 │
Viewer ──→  chat only, read-only access to viewer-permitted docs
```

RBAC is enforced at **three layers** for zero data leakage:
1. **API Layer** — Role dependencies reject unauthorized requests with `403`
2. **Search Layer** — `allowed_roles` filter applied to every Azure AI Search query
3. **Document List** — In-memory store filtered by role before any response is sent

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login → returns JWT access token |
| `GET` | `/auth/me` | Get current user profile |

### Documents

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | analyst, admin | Upload + process a document |
| `GET` | `/documents/` | all | List accessible documents |
| `GET` | `/documents/{id}/status` | all | Poll processing status |
| `DELETE` | `/documents/{id}` | admin | Delete a document |
| `PATCH` | `/documents/{id}/category` | admin | Change document category |

**Document processing pipeline:**
```
uploading → extracting → chunking → indexing → ready
```

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | SSE streaming RAG chat (real-time) |
| `GET` | `/chat/history/{session_id}` | Get conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear a session |

**SSE event stream format:**
```json
{"type": "citations", "citations": [...]}     // Sources found
{"type": "token",     "content": "..."}       // Streamed answer text
{"type": "done",      "total_tokens": 1250}   // Completion signal
{"type": "error",     "content": "..."}       // Error occurred
{"type": "replace",   "content": "..."}       // Content safety replacement
```

### Admin *(Admin role required)*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/audit` | Query audit logs with filters + pagination |
| `GET` | `/admin/audit/export?format=csv` | Export audit logs as CSV or JSON |
| `GET` | `/admin/usage` | All-user token analytics + cost estimate |
| `GET` | `/admin/users` | List all users |

### Usage

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/usage/me?period=daily` | Personal token usage *(daily / weekly / monthly / all-time)* |
| `GET` | `/usage/me/recent-queries` | Recent chat queries |

📖 **Full interactive API docs available at** `http://localhost:8000/docs` *(Swagger UI)*

---

## 🗂️ Project Structure

```
NexaVerse/
├── backend/
│   ├── main.py                    # App entry point, startup events
│   ├── config.py                  # Settings loaded from .env
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # ← Copy this to .env
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── auth.py                # JWT auth + demo users
│   │   └── rbac.py                # Role enforcement FastAPI dependencies
│   │
│   ├── models/
│   │   ├── user.py                # User, Token, Role Pydantic models
│   │   ├── document.py            # Document upload/status models
│   │   ├── chat.py                # Chat request/response + citations
│   │   └── audit.py               # Audit log + token usage models
│   │
│   ├── services/
│   │   ├── blob_service.py        # Azure Blob Storage operations
│   │   ├── document_intel.py      # Azure Document Intelligence (OCR/extract)
│   │   ├── search_service.py      # Azure AI Search — hybrid vector + keyword
│   │   ├── openai_service.py      # Azure OpenAI — embeddings + streaming chat
│   │   ├── cosmos_service.py      # Cosmos DB — audit logs + token tracking
│   │   └── content_safety.py      # Azure Content Safety moderation
│   │
│   ├── routers/
│   │   ├── auth.py                # /auth/* routes
│   │   ├── documents.py           # /documents/* routes
│   │   ├── chat.py                # /chat/* routes
│   │   ├── admin.py               # /admin/* routes
│   │   └── usage.py               # /usage/* routes
│   │
│   ├── utils/
│   │   ├── chunking.py            # Token-aware text chunking (tiktoken)
│   │   └── logging.py             # Structured JSON logger
│   │
│   └── scripts/
│       ├── create_search_index.py       # Manually create AI Search index
│       └── create_cosmos_containers.py  # Manually create Cosmos DB containers
│
├── frontend/                      # React 19 + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/            # Reusable UI components
│       ├── context/               # AuthContext (JWT state management)
│       ├── pages/
│       │   ├── Login.tsx          # Login page
│       │   ├── Chat.tsx           # Main RAG chat interface
│       │   ├── DocumentLibrary.tsx # Document upload + management
│       │   ├── AdminAudit.tsx     # Audit log viewer (admin only)
│       │   ├── AdminUsage.tsx     # Token usage analytics (admin only)
│       │   └── MyUsage.tsx        # Personal usage dashboard
│       └── utils/                 # API client + helpers
│
├── docker-compose.yml             # Full-stack deployment config
└── README.md
```

---

## 🧪 Testing the API

Quick test with `curl` (bash/WSL):

```bash
# Step 1: Login and capture the JWT token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Step 2: Upload a document
curl -X POST http://localhost:8000/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your-document.pdf" \
  -F "category=general"

# Step 3: Chat with your documents (real-time streaming)
curl -X POST http://localhost:8000/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the main topics in the uploaded documents?"}' \
  --no-buffer
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.6 | REST API framework |
| Uvicorn | 0.32.1 | ASGI server |
| OpenAI SDK | 1.97.1 | Azure OpenAI integration |
| Azure Cosmos SDK | 4.9.0 | Audit + token storage |
| Azure Search SDK | 11.6.0 | Hybrid search |
| Azure Blob SDK | 12.24.0 | Document file storage |
| Tiktoken | 0.8.0 | Token-aware chunking |
| Python-jose | 3.3.0 | JWT authentication |
| Pydantic | 2.10.4 | Data validation |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool + dev server |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 12 | Animations |
| React Router | 7 | Client-side routing |
| Axios | 1.18 | HTTP client |
| Lucide React | 1.23 | Icon library |

---

## 🚢 Production Deployment Checklist

- [ ] Replace demo users with **Azure Entra ID (MSAL)** for SSO
- [ ] Store secrets in **Azure Key Vault** instead of `.env`
- [ ] Persist document metadata to **Cosmos DB** (currently stored in memory)
- [ ] Enable **Azure Application Insights** for observability and tracing
- [ ] Add **per-user token quotas** via Cosmos DB policy checks
- [ ] Deploy backend to **Azure App Service** or **AKS**
- [ ] Deploy frontend to **Azure Static Web Apps** or behind **Azure CDN**
- [ ] Configure a custom domain and SSL/TLS certificate
- [ ] Set `APP_ENV=production` in your environment

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

<p align="center">Built with ❤️ using Azure AI + FastAPI + React</p>
