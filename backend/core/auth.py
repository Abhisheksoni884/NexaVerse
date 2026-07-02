"""
core/auth.py — JWT-based authentication with simulated demo users.

Demo credentials (change these in production or replace with Azure Entra ID):
  admin   / admin123
  analyst / analyst123
  viewer  / viewer123
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import get_settings
from models.user import User, UserInDB, UserRole, TokenData

settings = get_settings()

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Demo user store (replace with DB or Azure Entra ID in production) ─────────
DEMO_USERS: dict[str, UserInDB] = {
    "admin": UserInDB(
        username="admin",
        full_name="Admin User",
        role=UserRole.admin,
        hashed_password=pwd_context.hash("admin123"),
    ),
    "analyst": UserInDB(
        username="analyst",
        full_name="Analyst User",
        role=UserRole.analyst,
        hashed_password=pwd_context.hash("analyst123"),
    ),
    "viewer": UserInDB(
        username="viewer",
        full_name="Viewer User",
        role=UserRole.viewer,
        hashed_password=pwd_context.hash("viewer123"),
    ),
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


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


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """FastAPI dependency — decode JWT and return the current user."""
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
