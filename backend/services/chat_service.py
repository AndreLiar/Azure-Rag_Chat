import os
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import openai

from .search_service import SearchService
from db_models import Conversation, Message
from database import get_tenant_id


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.search_service = SearchService()
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.chat_model = os.getenv("OPENAI_MODEL_CHAT", "gpt-4o-mini")

    async def chat(
        self, message: str, conversation_id: Optional[str] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a chat message using RAG with database persistence"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        try:
            # Create new conversation if none provided
            if not conversation_id:
                conversation = Conversation(
                    organization_id=tenant_id,
                    user_id=user_id,
                    title=message[:50] + "..." if len(message) > 50 else message
                )
                self.db.add(conversation)
                await self.db.flush()
                conversation_id = str(conversation.id)
            else:
                # Verify conversation exists and belongs to tenant
                result = await self.db.execute(
                    select(Conversation).where(
                        and_(
                            Conversation.id == conversation_id,
                            Conversation.organization_id == tenant_id
                        )
                    )
                )
                conversation = result.scalar_one_or_none()
                if not conversation:
                    raise ValueError(f"Conversation {conversation_id} not found")

            # Search for relevant documents
            search_results = await self.search_service.search(message, top_k=5)

            # Build context from search results
            context = self._build_context(search_results)

            # Get conversation history from database
            history = await self._get_conversation_history(conversation_id)

            # Build the prompt
            system_prompt = self._build_system_prompt(context)
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history (limit to last 10 messages)
            messages.extend(history[-10:])

            # Add current user message
            messages.append({"role": "user", "content": message})

            # Get response from OpenAI
            response = self.openai_client.chat.completions.create(
                model=self.chat_model, messages=messages, temperature=0.7, max_tokens=1000
            )

            assistant_response = response.choices[0].message.content

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

            # Save user message to database
            user_message = Message(
                organization_id=tenant_id,
                conversation_id=conversation_id,
                user_id=user_id,
                role="user",
                content=message
            )
            self.db.add(user_message)

            # Save assistant message to database
            assistant_message = Message(
                organization_id=tenant_id,
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                content=assistant_response,
                sources=sources
            )
            self.db.add(assistant_message)

            await self.db.commit()

            return {
                "response": assistant_response,
                "conversation_id": conversation_id,
                "sources": sources,
            }

        except Exception as e:
            await self.db.rollback()
            raise e

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

    async def _get_conversation_history(self, conversation_id: str) -> List[Dict[str, str]]:
        """Get conversation history from database"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        messages = result.scalars().all()
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

    async def list_conversations(self, user_id: str = None) -> List[Dict[str, Any]]:
        """List conversations for the current tenant"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        query = select(Conversation).where(Conversation.organization_id == tenant_id)
        if user_id:
            query = query.where(Conversation.user_id == user_id)
        
        query = query.order_by(Conversation.created_at.desc())
        
        result = await self.db.execute(query)
        conversations = result.scalars().all()
        
        return [
            {
                "id": str(conv.id),
                "title": conv.title,
                "created_at": conv.created_at.isoformat() if conv.created_at else None
            }
            for conv in conversations
        ]

    async def create_conversation(self, user_id: str, title: str = None) -> Dict[str, Any]:
        """Create a new conversation"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        try:
            conversation = Conversation(
                organization_id=tenant_id,
                user_id=user_id,
                title=title or "New Conversation"
            )
            self.db.add(conversation)
            await self.db.commit()

            return {
                "id": str(conversation.id),
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat() if conversation.created_at else None
            }

        except Exception as e:
            await self.db.rollback()
            raise e

    async def get_conversation_with_messages(self, conversation_id: str, user_id: str = None) -> Dict[str, Any]:
        """Get conversation with full message history"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        try:
            # Get conversation
            conv_result = await self.db.execute(
                select(Conversation).where(
                    and_(
                        Conversation.id == conversation_id,
                        Conversation.organization_id == tenant_id
                    )
                )
            )
            conversation = conv_result.scalar_one_or_none()
            
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")

            # Get messages
            msg_result = await self.db.execute(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at)
            )
            messages = msg_result.scalars().all()

            return {
                "id": str(conversation.id),
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
                "messages": [
                    {
                        "id": str(msg.id),
                        "role": msg.role,
                        "content": msg.content,
                        "sources": msg.sources,
                        "created_at": msg.created_at.isoformat() if msg.created_at else None
                    }
                    for msg in messages
                ]
            }

        except Exception as e:
            raise e

    async def update_conversation_title(self, conversation_id: str, title: str) -> Dict[str, Any]:
        """Update conversation title"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        try:
            result = await self.db.execute(
                select(Conversation).where(
                    and_(
                        Conversation.id == conversation_id,
                        Conversation.organization_id == tenant_id
                    )
                )
            )
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")

            conversation.title = title
            await self.db.commit()

            return {
                "id": str(conversation.id),
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat() if conversation.created_at else None
            }

        except Exception as e:
            await self.db.rollback()
            raise e

    async def delete_conversation(self, conversation_id: str):
        """Delete a conversation and all its messages"""
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("No tenant context available")

        try:
            result = await self.db.execute(
                select(Conversation).where(
                    and_(
                        Conversation.id == conversation_id,
                        Conversation.organization_id == tenant_id
                    )
                )
            )
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")

            await self.db.delete(conversation)
            await self.db.commit()

        except Exception as e:
            await self.db.rollback()
            raise e
