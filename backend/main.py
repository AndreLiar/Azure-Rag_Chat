import os
import logging
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from config import config
from database import get_db
from sqlalchemy import text
from middleware import TenantContextMiddleware
from models import UserCreate, Token, ChatRequest, ChatResponse
from db_models import Base
from database import engine
from services import auth_service
from services.chat_service import ChatService
from services.document_service import DocumentService
from db_models import User

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=getattr(logging, config.log_level.upper()))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG Chat API - Multi-Tenant",
    description="A multi-tenant Retrieval-Augmented Generation API",
    version="2.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],  # Local development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Tenant Context Middleware
app.add_middleware(TenantContextMiddleware)

@app.on_event("startup")
async def create_tables():
    """Create database tables on startup"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        # Don't fail startup completely, allow app to start
        # The init_db.py script can be run separately if needed

# Security
security = HTTPBearer()

async def get_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> User:
    """Dependency to get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    return await auth_service.get_current_user(token, db)


# ======================================================
# Authentication Routes
# ======================================================
@app.post("/auth/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user_by_email(db, user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = await auth_service.create_user_and_organization(db, user_in)
    
    access_token = auth_service.create_access_token(
        data={"sub": user_in.email, "organization_id": str(new_user["organization_id"])}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user_by_email(db, form_data.username)
    if not user or not auth_service.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = auth_service.create_access_token(
        data={"sub": user.email, "organization_id": str(user.organization_id)}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ======================================================
# API Routes
# ======================================================
@app.get("/")
async def root():
    return {"message": "RAG Chat API is running"}


@app.get("/health")
async def health():
    """Comprehensive health check"""
    health_status = {"status": "healthy", "version": "1.1.0", "checks": {}}
    
    # Check database connectivity
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check OpenAI API key
    health_status["checks"]["openai_key"] = "configured" if os.getenv("OPENAI_API_KEY") else "missing"
    
    # Check Azure Search
    health_status["checks"]["azure_search"] = "configured" if os.getenv("AZURE_SEARCH_ENDPOINT") else "missing"
    
    return health_status


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and process a document for indexing"""
    document_service = DocumentService(db)
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process and index the document
        result = await document_service.process_document(temp_path, file.filename, str(current_user.id))

        # Clean up temp file
        os.remove(temp_path)

        return {
            "message": f"Document {file.filename} uploaded and indexed successfully",
            "document_id": result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with your documents using RAG"""
    chat_service = ChatService(db)
    try:
        response = await chat_service.chat(request.message, request.conversation_id, str(current_user.id))
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all indexed documents for the tenant"""
    document_service = DocumentService(db)
    try:
        documents = await document_service.list_documents()
        return {"documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document from the index"""
    document_service = DocumentService(db)
    try:
        await document_service.delete_document(document_id)
        return {"message": f"Document {document_id} deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Conversation management endpoints
@app.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all conversations for the current user"""
    chat_service = ChatService(db)
    try:
        conversations = await chat_service.list_conversations(str(current_user.id))
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversations")
async def create_conversation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    title: str = None
):
    """Create a new conversation"""
    chat_service = ChatService(db)
    try:
        conversation = await chat_service.create_conversation(str(current_user.id), title)
        return {"conversation": conversation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversation details and message history"""
    chat_service = ChatService(db)
    try:
        conversation = await chat_service.get_conversation_with_messages(conversation_id, str(current_user.id))
        return {"conversation": conversation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    title_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update conversation title"""
    chat_service = ChatService(db)
    try:
        title = title_data.get("title", "")
        conversation = await chat_service.update_conversation_title(conversation_id, title)
        return {"conversation": conversation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    chat_service = ChatService(db)
    try:
        await chat_service.delete_conversation(conversation_id)
        return {"message": f"Conversation {conversation_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
