import os
from contextvars import ContextVar
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
from config import config

load_dotenv()

# Try to load local environment file for development
if os.path.exists('.env.local'):
    load_dotenv('.env.local')

DATABASE_URL = config.database_url

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured in environment variables or Key Vault")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Context variable to hold the current tenant ID
tenant_id_context = ContextVar("tenant_id_context", default=None)

async def get_db() -> AsyncSession:
    """
    Dependency to get a database session.
    It also sets the tenant context for RLS.
    """
    async with AsyncSessionLocal() as session:
        tenant_id = tenant_id_context.get()
        if tenant_id:
            # Use parameterized query to prevent SQL injection
            await session.execute(text("SET app.current_tenant_id = :tenant_id"), {"tenant_id": tenant_id})
        yield session

def get_tenant_id() -> str:
    """Get the current tenant ID from context"""
    return tenant_id_context.get()

def set_tenant_id(tenant_id: str):
    """Set the current tenant ID in context"""
    tenant_id_context.set(tenant_id)
