#!/usr/bin/env python3
"""
Database initialization script for the RAG Chat application.
This script creates tables and applies the initial schema.
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from db_models import Base

# Load environment variables
load_dotenv()
if os.path.exists(".env.local"):
    load_dotenv(".env.local")


async def init_database():
    """Initialize database schema"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    print("Creating database engine...")
    engine = create_async_engine(database_url, echo=True)

    try:
        print("Creating database tables...")
        async with engine.begin() as conn:
            # Create tables
            await conn.run_sync(Base.metadata.create_all)

            # Skip RLS setup for local development (insufficient privileges)
            print("⚠️  Skipping Row Level Security setup for local development")
            print("   RLS would be configured in production environment")

            # Try to create vector extension if it doesn't exist
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                print("✅ pgvector extension enabled")
            except Exception as e:
                print(f"⚠️  pgvector extension not available: {e}")
                print("   Vector search will be disabled - using text-only search")

            print("Database initialization completed successfully!")

    except Exception as e:
        print(f"Error during database initialization: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_database())
