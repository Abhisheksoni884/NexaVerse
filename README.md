# 🌌 NexaVerse — Enterprise Knowledge Assistant

> **Ask your documents anything.** Upload enterprise documents and get accurate, citation-backed answers through an AI-powered chat interface.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Azure](https://img.shields.io/badge/Cloud-Azure%20AI-0078D4?style=flat-square&logo=microsoftazure)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)

---

## ✨ Features

- 📄 **Multi-format Document Upload** — PDF, DOCX, and images
- 🔍 **Hybrid Search** — Vector + keyword search via Azure AI Search
- 💬 **Streaming Chat** — Real-time answers with citations (SSE)
- 🔐 **Role-Based Access** — Admin / Analyst / Viewer roles
- 📊 **Token Usage Tracking** — Per-user analytics and cost estimates
- 🛡️ **Content Safety** — AI-powered input/output moderation
- 📝 **Full Audit Trail** — Every action logged to Cosmos DB
- 🐳 **Docker Ready** — One-command deployment

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker & Docker Compose *(optional)*
- Azure subscription with the services listed below

---

### Option A — Docker Compose *(Recommended)*

```bash
# 1. Clone the repo
git clone https://github.com/Abhisheksoni884/NexaVerse.git
cd NexaVerse

# 2. Set up environment variables
cp backend/.env.example backend/.env
# Fill in your Azure credentials in backend/.env

# 3. Start everything
docker-compose up --build
```

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ API | http://localhost:8000 |
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

# --- Backend ---
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r requirements.txt

cp .env.example .env           # fill in your Azure credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# --- Frontend (new terminal) ---
cd frontend
npm install
npm run dev
```

- Backend → http://localhost:8000
- Frontend → http://localhost:5173

---

## 🔑 Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

```env
# JWT
JWT_SECRET_KEY=your-secret-key   # python -c "import secrets; print(secrets.token_hex(32))"
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
```

---

## ☁️ Azure Service Setup

All indexes and Cosmos DB containers are **auto-created on first startup**.

| Service | What to do |
|---|---|
| **Azure OpenAI** | Deploy `gpt-4o` + `text-embedding-3-small`, copy endpoint + key |
| **Azure AI Search** | Create resource (Standard tier), copy endpoint + admin key |
| **Azure Blob Storage** | Create storage account + container named `documents`, copy connection string |
| **Azure Document Intelligence** | Create resource, copy endpoint + key |
| **Azure Cosmos DB** | Create NoSQL API account, copy URL + primary key |
| **Azure Content Safety** | Create resource, copy endpoint + key |

> Optionally pre-create resources manually:
> ```bash
> python backend/scripts/create_search_index.py
> python backend/scripts/create_cosmos_containers.py
> ```

---

## 👤 Demo Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Full access |
| `analyst` | `analyst123` | Upload + chat |
| `viewer` | `viewer123` | Read-only chat |

---

## 📡 API Reference

> Full interactive docs at **http://localhost:8000/docs**

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login → JWT token |
| `GET` | `/auth/me` | Current user profile |

### Documents
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | analyst, admin | Upload + process document |
| `GET` | `/documents/` | all | List accessible documents |
| `GET` | `/documents/{id}/status` | all | Poll processing status |
| `DELETE` | `/documents/{id}` | admin | Delete document |
| `PATCH` | `/documents/{id}/category` | admin | Change category |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | Streaming RAG chat (SSE) |
| `GET` | `/chat/history/{session_id}` | Get conversation history |
| `DELETE` | `/chat/history/{session_id}` | Clear session |

### Admin *(admin only)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/audit` | Audit logs with filters |
| `GET` | `/admin/audit/export?format=csv` | Export as CSV/JSON |
| `GET` | `/admin/usage` | All-user token analytics |
| `GET` | `/admin/users` | List all users |

### Usage
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/usage/me?period=daily` | Personal token usage |
| `GET` | `/usage/me/recent-queries` | Recent queries |

---

## 🗂️ Project Structure

```
NexaVerse/
├── backend/
│   ├── main.py                    # App entry point
│   ├── config.py                  # Settings from .env
│   ├── requirements.txt
│   ├── .env.example               # ← copy to .env
│   ├── core/
│   │   ├── auth.py                # JWT + demo users
│   │   └── rbac.py                # Role enforcement
│   ├── models/                    # Pydantic models
│   ├── services/                  # Azure service clients
│   ├── routers/                   # API route handlers
│   ├── utils/                     # Chunking + logging
│   └── scripts/                   # Index/DB setup scripts
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/               # AuthContext
│       ├── pages/                 # Login, Chat, Documents, Admin, Usage
│       └── utils/                 # API client
├── docker-compose.yml
└── README.md
```

---

<p align="center">Built with ❤️ using Azure AI + FastAPI + React</p>
