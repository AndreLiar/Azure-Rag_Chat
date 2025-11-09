# RAG Chat Application

A complete Retrieval-Augmented Generation (RAG) chat application built with FastAPI, Next.js, Azure AI Search, and OpenAI.

## 🚀 Features

- **Document Upload & Processing**: Support for PDF, DOCX, TXT, and CSV files
- **Intelligent Chat Interface**: Ask questions about your documents using OpenAI GPT models
- **Vector Search**: Powered by Azure AI Search with hybrid search (text + vector)
- **Source Citations**: Get relevant document citations with every AI response
- **Scalable Architecture**: Containerized deployment on Azure Container Apps and Static Web Apps

## 🏗️ Architecture

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

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Azure AI Search**: Hybrid vector search with semantic ranking
- **OpenAI**: GPT-4 for chat and text-embedding-3-small for embeddings
- **LangChain**: Document processing and RAG pipeline
- **Azure Storage**: Document storage

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons

### Infrastructure
- **Azure Container Apps**: Serverless backend hosting
- **Azure Static Web Apps**: Frontend hosting with GitHub integration
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker
- Azure CLI
- Terraform
- OpenAI API Key
- Azure Subscription

### 1. Clone and Setup

```bash
git clone https://github.com/AndreLiar/Azure-Rag_Chat.git
cd Azure-Rag_Chat
```

### 2. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

**Frontend:**
```bash
cd frontend
# Environment variables are configured via next.config.js
```

### 3. Local Development

**Start Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

### 4. Deploy with Docker

```bash
# Build and run both services
docker-compose up --build
```

## ☁️ Azure Deployment

### Infrastructure Setup

1. **Deploy Infrastructure:**
```bash
cd infra
terraform init
terraform apply
```

2. **Configure GitHub Secrets:**
```bash
# Required for CI/CD
AZURE_CREDENTIALS
OPENAI_API_KEY
AZURE_SEARCH_ENDPOINT
AZURE_SEARCH_KEY
AZURE_STORAGE_ACCOUNT_NAME
AZURE_STATIC_WEB_APPS_API_TOKEN
```

3. **Push to GitHub:**
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

The CI/CD pipeline will automatically:
- Build and test both applications
- Create Docker images
- Deploy backend to Azure Container Apps
- Deploy frontend to Azure Static Web Apps

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /upload` - Upload and process documents
- `POST /chat` - Chat with your documents
- `GET /documents` - List uploaded documents
- `DELETE /documents/{id}` - Delete a document

## 💡 How It Works

1. **Document Upload**: Users upload documents (PDF, DOCX, TXT, CSV)
2. **Processing**: Documents are split into chunks and embedded using OpenAI
3. **Indexing**: Chunks are stored in Azure AI Search with vector embeddings
4. **Query**: Users ask questions through the chat interface
5. **Retrieval**: System searches for relevant document chunks
6. **Generation**: OpenAI generates responses using retrieved context
7. **Response**: Users receive answers with source citations

## 🔧 Configuration

### Azure AI Search
- **Free Tier**: Supports up to 50MB of documents
- **Vector Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Search Algorithm**: HNSW with cosine similarity

### OpenAI Models
- **Chat**: gpt-4o-mini (configurable)
- **Embeddings**: text-embedding-3-small
- **Temperature**: 0.7 for balanced creativity

### Container Apps
- **CPU**: 0.25 cores
- **Memory**: 0.5 GB
- **Scaling**: 1-3 replicas based on load

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API Key**: Ensure valid API key with sufficient credits
2. **Azure Search**: Check service name and admin key
3. **CORS**: Configure allowed origins in backend
4. **Docker Build**: Ensure all dependencies are in requirements.txt

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🌟 Deployment Status

### Infrastructure Resources
- ✅ **Azure Resource Group**: `ragchat12481-rg`
- ✅ **Azure AI Search**: `ragchat12481-search`
- ✅ **Azure Storage**: `ragchat12481sa`
- ✅ **Azure Static Web App**: `https://zealous-grass-0c5e85103.3.azurestaticapps.net`
- ✅ **Azure Container Apps Environment**: `ragchat12481-cae`

### Current Status
- 🟢 Backend API: Running locally
- 🟢 Frontend UI: Running locally
- 🟡 Container Apps: Ready for deployment
- 🟡 CI/CD Pipeline: Configured, ready for first push

### Next Steps
1. Push code to GitHub repository
2. Configure GitHub secrets for deployment
3. CI/CD will automatically deploy to Azure
4. Test the full production environment

## 🔗 Live Application

Once deployed, the application will be available at:
- **Frontend**: https://zealous-grass-0c5e85103.3.azurestaticapps.net
- **Backend API**: Will be provided after Container Apps deployment