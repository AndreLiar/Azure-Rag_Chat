import os
from typing import List, Dict, Any
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.models import VectorizedQuery
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    VectorSearchProfile,
    VectorSearchAlgorithmMetric,
    VectorSearchAlgorithmKind,
    HnswAlgorithmConfiguration,
)
from azure.core.credentials import AzureKeyCredential
import openai

class SearchService:
    def __init__(self):
        self.search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        self.search_key = os.getenv("AZURE_SEARCH_KEY") 
        self.index_name = "documents"
        
        # Initialize OpenAI
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embedding_model = os.getenv("OPENAI_MODEL_EMBED", "text-embedding-3-small")
        
        # Initialize Azure Search clients
        self.credential = AzureKeyCredential(self.search_key)
        self.search_client = SearchClient(
            endpoint=self.search_endpoint,
            index_name=self.index_name,
            credential=self.credential
        )
        self.index_client = SearchIndexClient(
            endpoint=self.search_endpoint,
            credential=self.credential
        )
        
        # Create index if it doesn't exist
        self._create_index_if_not_exists()
    
    def _create_index_if_not_exists(self):
        """Create the search index if it doesn't exist"""
        try:
            # Check if index exists
            self.index_client.get_index(self.index_name)
        except:
            # Create index
            fields = [
                SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                SearchableField(name="content", type=SearchFieldDataType.String),
                SearchableField(name="title", type=SearchFieldDataType.String),
                SimpleField(name="source", type=SearchFieldDataType.String),
                SearchField(
                    name="content_vector",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    searchable=True,
                    vector_search_dimensions=1536,
                    vector_search_profile_name="my-vector-config"
                ),
            ]
            
            # Configure vector search
            vector_search = VectorSearch(
                profiles=[VectorSearchProfile(
                    name="my-vector-config",
                    algorithm_configuration_name="my-algorithms-config",
                )],
                algorithms=[HnswAlgorithmConfiguration(
                    name="my-algorithms-config",
                    kind=VectorSearchAlgorithmKind.HNSW,
                    parameters={
                        "m": 4,
                        "efConstruction": 400,
                        "efSearch": 500,
                        "metric": VectorSearchAlgorithmMetric.COSINE
                    }
                )]
            )
            
            # Create the search index
            index = SearchIndex(
                name=self.index_name,
                fields=fields,
                vector_search=vector_search
            )
            
            self.index_client.create_index(index)
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embeddings for text using OpenAI"""
        response = self.openai_client.embeddings.create(
            input=text,
            model=self.embedding_model
        )
        return response.data[0].embedding
    
    async def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents to the search index"""
        # Add embeddings to documents
        for doc in documents:
            doc["content_vector"] = self.get_embedding(doc["content"])
        
        # Upload to Azure Search
        result = self.search_client.upload_documents(documents)
        return result
    
    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for documents using hybrid search (text + vector)"""
        # Get query embedding
        query_vector = self.get_embedding(query)
        
        # Create vector query
        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=top_k,
            fields="content_vector"
        )
        
        # Perform hybrid search
        results = self.search_client.search(
            search_text=query,
            vector_queries=[vector_query],
            select=["id", "content", "title", "source"],
            top=top_k
        )
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result["id"],
                "content": result["content"],
                "title": result["title"],
                "source": result["source"],
                "score": result["@search.score"]
            })
        
        return formatted_results
    
    async def delete_document(self, document_id: str):
        """Delete a document from the search index"""
        self.search_client.delete_documents([{"id": document_id}])
    
    async def list_all_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the index"""
        results = self.search_client.search(
            search_text="*",
            select=["id", "title", "source"]
        )
        
        return [{"id": r["id"], "title": r["title"], "source": r["source"]} for r in results]