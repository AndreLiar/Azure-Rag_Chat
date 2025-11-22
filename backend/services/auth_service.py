import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from fastapi import HTTPException

from config import config
from models import UserCreate
from db_models import User, Organization

# Secret key to sign the JWT token
SECRET_KEY = config.secret_key or "a_very_secret_key_fallback"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def create_user_and_organization(db: AsyncSession, user_in: UserCreate):
    """
    Creates a new organization and an admin user for it.
    """
    try:
        # Create organization
        organization = Organization(name=user_in.name, subscription_tier="free")
        db.add(organization)
        await db.flush()  # Get the organization ID

        # Create admin user
        hashed_password = get_password_hash(user_in.password)
        user = User(
            organization_id=organization.id,
            email=user_in.email,
            password_hash=hashed_password,
            role="admin",
        )
        db.add(user)
        await db.commit()

        return {"user_id": user.id, "organization_id": organization.id}
    except Exception as e:
        await db.rollback()
        raise e


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email address"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_current_user(token: str, db: AsyncSession) -> User:
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = await get_user_by_email(db, email)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
