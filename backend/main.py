import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(
    title="RAG Chat API",
    description="A Retrieval-Augmented Generation API with Azure AI Search",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service variables
search_service = None
document_service = None
chat_service = None


def initialize_services():
    """Initialize services - called at startup or for testing"""
    global search_service, document_service, chat_service
    if search_service is None:
        from services.chat_service import ChatService
        from services.document_service import DocumentService
        from services.search_service import SearchService

        search_service = SearchService()
        document_service = DocumentService()
        chat_service = ChatService(search_service)


# Initialize services for production
if os.getenv("TESTING") != "1":
    initialize_services()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[dict] = []


@app.get("/")
async def root():
    return {"message": "RAG Chat API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document for indexing"""
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process and index the document
        result = await document_service.process_document(temp_path, file.filename)

        # Clean up temp file
        os.remove(temp_path)

        return {
            "message": f"Document {file.filename} uploaded and indexed successfully",
            "document_id": result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with your documents using RAG"""
    try:
        response = await chat_service.chat(request.message, request.conversation_id)
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def list_documents():
    """List all indexed documents"""
    try:
        documents = await document_service.list_documents()
        return {"documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document from the index"""
    try:
        await document_service.delete_document(document_id)
        return {"message": f"Document {document_id} deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
