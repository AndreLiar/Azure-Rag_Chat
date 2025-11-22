#!/usr/bin/env python3
"""
Test database connection and verify setup
"""
import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load environment variables
load_dotenv()
if os.path.exists('.env.local'):
    load_dotenv('.env.local')

async def test_database():
    """Test database connection and schema"""
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    print(f"Testing connection to: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            # Test basic connectivity
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ Connected to PostgreSQL: {version.split(',')[0]}")
            
            # Check tables
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = result.fetchall()
            
            if tables:
                print(f"✅ Found {len(tables)} tables:")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("⚠️  No tables found - running table creation...")
                
                # Import and create tables
                from db_models import Base
                await conn.run_sync(Base.metadata.create_all)
                print("✅ Tables created successfully")
                
                # Verify creation
                result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
                tables = result.fetchall()
                print(f"✅ Verified {len(tables)} tables created:")
                for table in tables:
                    print(f"   - {table[0]}")
            
            print("🎉 Database setup completed successfully!")
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_database())