"""
core/auth.py — JWT-based authentication with simulated demo users.

Demo credentials (change these in production or replace with Azure Entra ID):
  test / test123
  admin / admin123
  analyst / analyst123
  viewer / viewer123
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from jose import JWTError, jwt

from config import get_settings
from models.user import User, UserInDB, UserRole, TokenData
from utils.logging import logger

settings = get_settings()

# ── Custom security scheme that supports both cookies and Bearer tokens ─────
http_bearer = HTTPBearer(auto_error=False)

COOKIE_NAME = "auth_token"


# ── Demo user store (replace with DB or Azure Entra ID in production) ─────────
# Using plain text passwords for development simplicity
DEMO_USERS: dict[str, UserInDB] = {
    "test": UserInDB(
        username="test",
        full_name="Test User",
        role=UserRole.admin,
        hashed_password="test123",  # Plain text for dev
    ),
    "admin": UserInDB(
        username="admin",
        full_name="Admin User",
        role=UserRole.admin,
        hashed_password="admin123",  # Plain text for dev
    ),
    "analyst": UserInDB(
        username="analyst",
        full_name="Analyst User",
        role=UserRole.analyst,
        hashed_password="analyst123",  # Plain text for dev
    ),
    "viewer": UserInDB(
        username="viewer",
        full_name="Viewer User",
        role=UserRole.viewer,
        hashed_password="viewer123",  # Plain text for dev
    ),
}


def verify_password(plain_password: str, stored_password: str) -> bool:
    """Simple string comparison for development"""
    return plain_password == stored_password


def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = DEMO_USERS.get(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(
    auth_credentials: Optional[HTTPAuthCredentials] = Depends(http_bearer),
    auth_token: Optional[str] = Cookie(None, alias=COOKIE_NAME),
) -> User:
    """
    FastAPI dependency — Extract JWT from either:
    1. Authorization Bearer header (for API clients)
    2. HTTP-only cookie (for browser clients)
    
    Returns the current user.
    """
    # Try cookie first (browser clients), then Authorization header (API clients)
    token = auth_token or (auth_credentials.credentials if auth_credentials else None)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception

    user = DEMO_USERS.get(token_data.username)
    if user is None or user.disabled:
        raise credentials_exception
    return user


async def get_current_user_from_query(token: Optional[str] = None) -> User:
    """
    Alternative dependency for SSE endpoints that can't use Authorization header.
    Validates JWT token passed as query parameter.
    """
    logger.info(f"get_current_user_from_query called with token: {token[:20] if token else 'None'}...")
    
    if not token:
        logger.error("No token provided in query parameters")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise credentials_exception

    user = DEMO_USERS.get(token_data.username)
    if user is None or user.disabled:
        logger.error(f"User not found or disabled: {token_data.username}")
        raise credentials_exception
    
    logger.info(f"User authenticated successfully: {user.username}")
    return user

