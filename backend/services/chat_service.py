import os
import uuid
from typing import List, Dict, Any, Optional
import openai
from .search_service import SearchService


class ChatService:
    def __init__(self, search_service: SearchService):
        self.search_service = search_service
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chat_model = os.getenv("OPENAI_MODEL_CHAT", "gpt-4o-mini")
        self.conversations = {}  # In-memory storage (use Redis/DB for production)

    async def chat(
        self, message: str, conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a chat message using RAG"""

        # Create new conversation if none provided
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            self.conversations[conversation_id] = []

        # Search for relevant documents
        search_results = await self.search_service.search(message, top_k=5)

        # Build context from search results
        context = self._build_context(search_results)

        # Get conversation history
        history = self.conversations.get(conversation_id, [])

        # Build the prompt
        system_prompt = self._build_system_prompt(context)
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        messages.extend(history)

        # Add current user message
        messages.append({"role": "user", "content": message})

        # Get response from OpenAI
        response = self.openai_client.chat.completions.create(
            model=self.chat_model, messages=messages, temperature=0.7, max_tokens=1000
        )

        assistant_response = response.choices[0].message.content

        # Update conversation history
        self.conversations[conversation_id] = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": assistant_response},
        ]

        # Keep only last 10 messages to avoid token limits
        if len(self.conversations[conversation_id]) > 10:
            self.conversations[conversation_id] = self.conversations[conversation_id][
                -10:
            ]

        # Format sources for response
        sources = [
            {
                "title": result["title"],
                "content": (
                    result["content"][:200] + "..."
                    if len(result["content"]) > 200
                    else result["content"]
                ),
                "source": result["source"],
                "score": result["score"],
            }
            for result in search_results[:3]  # Return top 3 sources
        ]

        return {
            "response": assistant_response,
            "conversation_id": conversation_id,
            "sources": sources,
        }

    def _build_context(self, search_results: List[Dict[str, Any]]) -> str:
        """Build context from search results"""
        if not search_results:
            return "No relevant documents found."

        context_parts = []
        for i, result in enumerate(search_results, 1):
            context_parts.append(f"Document {i}:")
            context_parts.append(f"Title: {result['title']}")
            context_parts.append(f"Content: {result['content']}")
            context_parts.append("")  # Empty line for separation

        return "\n".join(context_parts)

    def _build_system_prompt(self, context: str) -> str:
        """Build the system prompt with context"""
        return (
            f"You are a helpful AI assistant that answers questions "
            f"based on the provided documents.\n\n"
            f"Use the following documents to answer the user's question. "
            f"If the information is not available in the documents, "
            f"say so clearly.\n\n"
            f"Available Documents:\n{context}\n\n"
            f"Instructions:\n"
            f"- Answer based primarily on the provided documents\n"
            f"- Be accurate and cite specific information when possible\n"
            f"- If you're not sure about something, express uncertainty\n"
            f"- Keep responses clear and helpful\n"
            f"- If no relevant information is found in the documents, "
            f"state this clearly"
        )

    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, str]]:
        """Get conversation history"""
        return self.conversations.get(conversation_id, [])

    def clear_conversation(self, conversation_id: str):
        """Clear a conversation"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
