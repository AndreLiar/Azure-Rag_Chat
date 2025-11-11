# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A complete Retrieval-Augmented Generation (RAG) chat application built with FastAPI backend and Next.js frontend, deployed on Azure. Users can upload documents and chat with them using OpenAI's GPT models and Azure AI Search for vector retrieval.

## Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS (deployed on Azure Static Web Apps)
- **Backend**: FastAPI with Python 3.11+ (deployed on Azure Container Apps)
- **Search**: Azure AI Search with hybrid vector/text search
- **Storage**: Azure Blob Storage for documents
- **AI**: OpenAI GPT-4 for chat, text-embedding-3-small for embeddings
- **Infrastructure**: Terraform for Azure resource provisioning

## Common Commands

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

**Docker Development:**
```bash
docker-compose up --build
```

### Infrastructure (from infra/ directory)

```bash
terraform init
terraform plan
terraform apply
terraform destroy
```

### Testing

The application uses Swagger UI for API testing at `http://localhost:8000/docs` when backend is running locally.

## Code Structure

### Backend Architecture (`backend/`)

- `main.py`: FastAPI app with endpoints for upload, chat, documents CRUD
- `services/`: Core business logic
  - `search_service.py`: Azure AI Search integration
  - `document_service.py`: Document processing and storage
  - `chat_service.py`: RAG chat implementation
- `requirements.txt`: Python dependencies

### Frontend Architecture (`frontend/`)

- `src/app/`: Next.js App Router pages
- `src/components/`: React components
  - `ChatInterface.tsx`: Main chat UI
  - `DocumentUpload.tsx`: File upload component

### Key API Endpoints

- `POST /upload`: Upload and index documents (PDF, DOCX, TXT, CSV)
- `POST /chat`: Chat with documents using RAG
- `GET /documents`: List indexed documents  
- `DELETE /documents/{id}`: Remove document from index

## Environment Variables

**Required for backend:**
- `OPENAI_API_KEY`: OpenAI API key
- `AZURE_SEARCH_ENDPOINT`: Azure AI Search service URL
- `AZURE_SEARCH_KEY`: Azure AI Search admin key
- `AZURE_STORAGE_ACCOUNT_NAME`: Azure Storage account name

**Optional:**
- `LOG_LEVEL`: Logging level (default: INFO)
- `ENVIRONMENT`: development/production

## Development Notes

- FastAPI app runs on port 8000, Next.js on port 3000
- CORS is configured for localhost:3000 and production Azure Static Web App
- Documents are temporarily stored in `/tmp` during processing
- The app uses Azure's free tier services for cost optimization
- Container Apps auto-scales 1-3 replicas based on load

## Deployment

The project has CI/CD configured via GitHub Actions for automatic deployment to Azure when pushing to main branch. Infrastructure must be provisioned first using Terraform.