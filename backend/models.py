from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime


class Organization(BaseModel):
    id: uuid.UUID
    name: str
    subscription_tier: str
    stripe_customer_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str
    name: str  # For organization creation


class Token(BaseModel):
    access_token: str
    token_type: str


class Document(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    filename: str
    blob_url: str
    file_size: Optional[int]
    status: str
    uploaded_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class Conversation(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Message(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    content: str
    sources: Optional[List[dict]]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: Optional[List[dict]] = None
