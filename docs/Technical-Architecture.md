# Project Overview and Technical Architecture

## 1. Title Page & Metadata

**Project Name:** Azure RAG Chat Application  
**Version:** 1.0  
**Date:** November 2024  
**Authors:** Development Team  
**Status:** Final  

**Summary:** A complete Retrieval-Augmented Generation (RAG) chat application that allows users to upload documents and have intelligent conversations with their content using OpenAI GPT models and Azure AI Search.

---

## 2. Introduction

### 2.1. Purpose

This project solves the problem of information retrieval from large document collections. Instead of manually searching through documents, users can:
- Upload various document types (PDF, DOCX, TXT, CSV)
- Ask natural language questions about their documents
- Receive AI-powered responses with source citations
- Maintain conversation context across multiple queries

**Goals:**
- Provide instant, accurate answers from uploaded documents
- Enable semantic search through vector embeddings
- Offer a user-friendly chat interface
- Deploy cost-effectively on Azure cloud services

### 2.2. Scope

**Included:**
- Document upload and text extraction
- Vector embeddings generation using OpenAI
- Hybrid search (text + vector) using Azure AI Search
- RAG-powered chat using OpenAI GPT models
- Web-based frontend interface
- Azure cloud deployment with Container Apps and Static Web Apps
- CI/CD pipeline for automated deployment

**Excluded:**
- Real-time collaboration features
- User authentication and authorization
- Document editing capabilities
- Non-text document analysis (images, audio, video)
- On-premise deployment options

### 2.3. Target Audience

- **Backend Developers:** Understanding the FastAPI service architecture
- **Frontend Developers:** Working with the Next.js interface
- **DevOps Engineers:** Deploying and managing Azure infrastructure
- **Project Managers:** Understanding system capabilities and limitations
- **New Team Members:** Getting up to speed on the project

### 2.4. Definitions, Acronyms, and Abbreviations

- **RAG:** Retrieval-Augmented Generation - AI technique combining document retrieval with language generation
- **API:** Application Programming Interface
- **CLI:** Command Line Interface
- **CORS:** Cross-Origin Resource Sharing
- **HNSW:** Hierarchical Navigable Small World - vector search algorithm
- **SDK:** Software Development Kit
- **Vector Embedding:** Numerical representation of text for similarity search

---

## 3. System Overview

### 3.1. High-Level Architecture

The system follows a three-tier architecture:

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Next.js Frontend  │───▶│   FastAPI Backend    │───▶│  Azure AI Search    │
│ (Azure Static Apps) │    │ (Azure Container App)│    │  (Vector Search)    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                       │                          │
                                       ▼                          ▼
                            ┌──────────────────────┐    ┌─────────────────────┐
                            │    OpenAI API        │    │  Azure Storage      │
                            │  (GPT + Embeddings)  │    │  (Document Store)   │
                            └──────────────────────┘    └─────────────────────┘
```

**Data Flow:**
1. User uploads document through frontend
2. Backend extracts and chunks document text
3. OpenAI creates vector embeddings for text chunks
4. Chunks and embeddings stored in Azure AI Search
5. User asks question through chat interface
6. System searches for relevant document chunks
7. OpenAI generates response using retrieved context
8. Response with sources returned to user

### 3.2. Key Features & Functionality

- **Document Processing:** Extracts text from PDF, DOCX, TXT, CSV files
- **Intelligent Chunking:** Splits documents into overlapping segments for better retrieval
- **Vector Search:** Uses semantic similarity to find relevant content
- **Hybrid Search:** Combines traditional keyword search with vector similarity
- **Contextual Chat:** Maintains conversation history for follow-up questions
- **Source Citations:** Provides document references for each AI response
- **Scalable Deployment:** Auto-scales based on usage with Azure Container Apps
- **Cost Optimization:** Uses Azure free tiers where possible

---

## 4. Detailed Design & Components

### 4.1. Technology Stack

**Backend:**
- Python 3.11+
- FastAPI (web framework)
- OpenAI Python SDK (GPT & embeddings)
- Azure SDK for Python (Search, Storage)
- PyPDF, python-docx, pandas (document processing)
- Uvicorn (ASGI server)

**Frontend:**
- Node.js 18+
- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Axios (HTTP client)

**Cloud Services:**
- Azure AI Search (vector search)
- Azure Container Apps (backend hosting)
- Azure Static Web Apps (frontend hosting)
- Azure Storage Account (document storage)
- Azure Monitor (logging & metrics)

**Infrastructure:**
- Terraform (Infrastructure as Code)
- Docker (containerization)
- GitHub Actions (CI/CD)

### 4.2. Component Breakdown

#### 4.2.1. Backend (`backend/`)

**Purpose:** Handles document processing, search operations, and chat functionality

**Location:** `/backend`

**Key Files:**
- `main.py` - FastAPI application with REST endpoints
- `services/search_service.py` - Azure AI Search integration and vector operations
- `services/document_service.py` - Document text extraction and chunking
- `services/chat_service.py` - RAG chat implementation with OpenAI
- `requirements.txt` - Python dependencies
- `Dockerfile` - Container configuration

**Dependencies:** 
- Azure AI Search service
- OpenAI API
- Azure Storage Account (for future document storage)

#### 4.2.2. Frontend (`frontend/`)

**Purpose:** Provides user interface for document upload and chat interactions

**Location:** `/frontend`

**Key Files:**
- `src/app/page.tsx` - Main application page
- `src/app/layout.tsx` - Root layout and metadata
- `src/components/ChatInterface.tsx` - Chat UI component
- `src/components/DocumentUpload.tsx` - File upload component
- `package.json` - Node.js dependencies
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration

**Dependencies:**
- Backend API (FastAPI)
- Modern web browser with JavaScript

#### 4.2.3. Infrastructure (`infra/`)

**Purpose:** Defines and provisions Azure cloud resources

**Location:** `/infra`

**Key Files:**
- `main.tf` - Primary Terraform configuration
- `variables.tf` - Configurable parameters
- `outputs.tf` - Resource outputs for applications
- `provider.tf` - Azure provider configuration

**Dependencies:**
- Azure subscription
- Terraform CLI
- Azure CLI

---

## 5. Getting Started (Development Setup)

### 5.1. Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org))
- **Python** 3.11+ ([Download](https://python.org))
- **Docker** ([Download](https://docker.com))
- **Azure CLI** ([Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- **Terraform** ([Download](https://terraform.io))
- **OpenAI API Key** ([Get from OpenAI Platform](https://platform.openai.com))
- **Azure Subscription** ([Free Account](https://azure.microsoft.com/free))

### 5.2. Installation & Configuration

#### 5.2.1. Clone Repository
```bash
git clone https://github.com/AndreLiar/Azure-Rag_Chat.git
cd Azure-Rag_Chat
```

#### 5.2.2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` file with your credentials:
```bash
OPENAI_API_KEY=your_openai_api_key_here
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_KEY=your_search_admin_key
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
LOG_LEVEL=INFO
```

#### 5.2.3. Frontend Setup
```bash
cd frontend
npm install
```

#### 5.2.4. Azure Infrastructure Setup
```bash
cd infra
terraform init
terraform plan
terraform apply
```

This will provision:
- Azure AI Search service
- Azure Storage Account
- Azure Container Apps Environment
- Azure Static Web App

### 5.3. Running the Application

#### 5.3.1. Local Development

**Start Backend:**
```bash
cd backend
python -m uvicorn main:app --reload
```
Backend runs on: `http://localhost:8000`
API docs available at: `http://localhost:8000/docs`

**Start Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:3000`

#### 5.3.2. Docker Development

```bash
# Start both services
docker-compose up --build

# Stop services
docker-compose down
```

---

## 6. Deployment

### 6.1. Azure Cloud Deployment

The project uses GitHub Actions for automated CI/CD deployment:

**Required GitHub Secrets:**
```bash
AZURE_CREDENTIALS          # Service Principal JSON
OPENAI_API_KEY             # OpenAI API key
AZURE_SEARCH_ENDPOINT      # From Terraform outputs
AZURE_SEARCH_KEY           # From Azure portal
AZURE_STORAGE_ACCOUNT_NAME # From Terraform outputs
AZURE_STATIC_WEB_APPS_API_TOKEN # From Azure portal
```

**Deployment Process:**
1. Push code to `main` branch
2. GitHub Actions triggers automatically
3. Backend builds Docker image and deploys to Container Apps
4. Frontend builds static site and deploys to Static Web Apps
5. Infrastructure updates applied if Terraform changes detected

### 6.2. Environment Configuration

**Staging:** Uses development configuration with reduced resources
**Production:** Uses optimized configuration with monitoring enabled

---

## 7. API Documentation

### 7.1. Base URL
- **Local:** `http://localhost:8000`
- **Production:** Provided after Container Apps deployment

### 7.2. Authentication
Currently no authentication required (add as needed for production)

### 7.3. Key Endpoints

#### Document Management
```http
POST /upload
Content-Type: multipart/form-data
Body: file (PDF, DOCX, TXT, CSV)
Response: {"message": "...", "document_id": "uuid"}
```

```http
GET /documents
Response: {"documents": [{"id": "...", "title": "...", "source": "..."}]}
```

```http
DELETE /documents/{document_id}
Response: {"message": "Document deleted successfully"}
```

#### Chat Operations
```http
POST /chat
Content-Type: application/json
Body: {"message": "string", "conversation_id": "string?"}
Response: {
  "response": "string",
  "conversation_id": "string", 
  "sources": [{"title": "...", "content": "...", "source": "...", "score": 0.95}]
}
```

#### Health & Status
```http
GET /
Response: {"message": "RAG Chat API is running"}

GET /health
Response: {"status": "healthy"}
```

### 7.4. Detailed API Documentation
Visit `http://localhost:8000/docs` for interactive Swagger UI documentation

---

## 8. Operational Guide

### 8.1. Common Tasks

#### Add New Document Type Support
1. Update `supported_extensions` in `document_service.py:17`
2. Add extraction method in `_extract_text()` function
3. Install required parsing library in `requirements.txt`
4. Test with sample files

#### Monitor System Performance
```bash
# Check backend logs
docker logs <container_name>

# Azure Container Apps logs
az containerapp logs show --name ragchat-api --resource-group ragchat-rg

# Check search service metrics
az search service show --name your-search-service --resource-group ragchat-rg
```

#### Update OpenAI Models
Edit environment variables:
```bash
OPENAI_MODEL_CHAT=gpt-4          # For chat responses
OPENAI_MODEL_EMBED=text-embedding-3-small  # For embeddings
```

#### Scale Container Apps
```bash
az containerapp update --name ragchat-api --resource-group ragchat-rg --min-replicas 2 --max-replicas 10
```

### 8.2. Troubleshooting

#### Common Issues & Solutions

**Problem:** "OpenAI API key not found"
```bash
# Solution: Check environment variable
echo $OPENAI_API_KEY
# Set if missing
export OPENAI_API_KEY=your_key_here
```

**Problem:** "Azure Search service not accessible"
```bash
# Solution: Verify search service exists and key is correct
az search service show --name your-search-service --resource-group ragchat-rg
az search admin-key show --service-name your-search-service --resource-group ragchat-rg
```

**Problem:** "CORS error in browser"
```bash
# Solution: Add frontend URL to backend CORS origins
# Edit docker-compose.yml or environment variable:
CORS_ORIGINS=http://localhost:3000,https://your-frontend-url
```

**Problem:** "Document upload fails"
```bash
# Check file size (limit: 50MB for free tier)
# Check file format is supported
# Verify disk space in container
```

**Problem:** "Search returns no results"
```bash
# Verify documents are indexed
curl http://localhost:8000/documents

# Check search service has documents
az search index statistics show --service-name your-search-service --index-name documents --resource-group ragchat-rg
```

### 8.3. Monitoring & Logging

#### Application Logs
- **Backend:** FastAPI automatically logs to stdout
- **Frontend:** Next.js logs to console and build output
- **Azure:** Application Insights collects logs and metrics

#### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health  
curl http://localhost:3000

# Search service health
curl https://your-search-service.search.windows.net?api-version=2023-11-01
```

#### Performance Monitoring
- **Response Times:** Monitor API endpoint latency
- **Search Performance:** Track search query response times
- **Token Usage:** Monitor OpenAI API costs and usage
- **Azure Costs:** Use Azure Cost Management for billing alerts

#### Log Locations
- **Local Development:** Terminal output
- **Docker:** `docker logs <container_name>`
- **Azure Container Apps:** Azure Portal > Container Apps > Logs
- **Azure Static Web Apps:** Azure Portal > Static Web Apps > Functions

---

## 9. System Communication Details

### 9.1. Request Flow

#### Document Upload Flow
1. **Frontend → Backend:** HTTP POST with multipart file data
2. **Backend → File System:** Temporary file storage (`/tmp/`)
3. **Backend → Document Service:** Text extraction and chunking
4. **Document Service → OpenAI:** Generate embeddings for each chunk
5. **Document Service → Azure Search:** Index chunks with embeddings
6. **Backend → Frontend:** Success response with document ID

#### Chat Query Flow
1. **Frontend → Backend:** HTTP POST with user message
2. **Backend → Chat Service:** Process chat request
3. **Chat Service → OpenAI:** Generate query embedding
4. **Chat Service → Azure Search:** Hybrid search for relevant chunks
5. **Chat Service → OpenAI:** Generate response using retrieved context
6. **Backend → Frontend:** Response with AI answer and sources

### 9.2. Data Persistence

- **Conversation History:** In-memory storage (production should use Redis/Database)
- **Document Chunks:** Azure AI Search index
- **Original Files:** Temporarily stored during processing, then deleted
- **Configuration:** Environment variables and Azure Key Vault

### 9.3. Error Handling

- **API Errors:** HTTP status codes with descriptive messages
- **Timeout Handling:** Configurable timeouts for external API calls
- **Retry Logic:** Automatic retries for transient Azure service failures
- **Graceful Degradation:** System continues operating if non-critical services fail

This comprehensive technical documentation provides the foundation for understanding, developing, and maintaining the Azure RAG Chat application.