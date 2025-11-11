import os
import uuid
from typing import List, Dict, Any
from pathlib import Path
import asyncio

# Document processing imports
import pypdf
import docx
import pandas as pd

from .search_service import SearchService


class DocumentService:
    def __init__(self):
        self.search_service = SearchService()
        self.supported_extensions = {".pdf", ".docx", ".txt", ".csv"}

    async def process_document(self, file_path: str, filename: str) -> str:
        """Process a document and add it to the search index"""
        file_extension = Path(filename).suffix.lower()

        if file_extension not in self.supported_extensions:
            raise ValueError(f"Unsupported file type: {file_extension}")

        # Extract text content
        content = self._extract_text(file_path, file_extension)

        # Split into chunks
        chunks = self._split_text(content)

        # Create documents for indexing
        documents = []
        base_id = str(uuid.uuid4())

        for i, chunk in enumerate(chunks):
            doc = {
                "id": f"{base_id}_{i}",
                "content": chunk,
                "title": filename,
                "source": filename,
            }
            documents.append(doc)

        # Add to search index
        await self.search_service.add_documents(documents)

        return base_id

    def _extract_text(self, file_path: str, file_extension: str) -> str:
        """Extract text from different file types"""
        if file_extension == ".pdf":
            return self._extract_from_pdf(file_path)
        elif file_extension == ".docx":
            return self._extract_from_docx(file_path)
        elif file_extension == ".txt":
            return self._extract_from_txt(file_path)
        elif file_extension == ".csv":
            return self._extract_from_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        with open(file_path, "rb") as file:
            reader = pypdf.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text

    def _extract_from_txt(self, file_path: str) -> str:
        """Extract text from TXT"""
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()

    def _extract_from_csv(self, file_path: str) -> str:
        """Extract text from CSV"""
        df = pd.read_csv(file_path)
        return df.to_string()

    def _split_text(
        self, text: str, chunk_size: int = 1000, overlap: int = 200
    ) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i : i + chunk_size])
            if chunk.strip():  # Only add non-empty chunks
                chunks.append(chunk)

        return chunks

    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the index"""
        return await self.search_service.list_all_documents()

    async def delete_document(self, document_id: str):
        """Delete a document and all its chunks from the index"""
        # Get all chunks for this document
        all_docs = await self.search_service.list_all_documents()

        # Find chunks that belong to this document
        chunks_to_delete = [
            doc["id"] for doc in all_docs if doc["id"].startswith(document_id)
        ]

        # Delete each chunk
        for chunk_id in chunks_to_delete:
            await self.search_service.delete_document(chunk_id)
