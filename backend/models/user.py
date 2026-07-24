"""
models/user.py — Pydantic models for users, roles, and JWT tokens.
"""
from enum import Enum
from pydantic import BaseModel
from typing import Optional


class UserRole(str, Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class User(BaseModel):
    username: str
    full_name: str
    role: UserRole
    disabled: bool = False


class UserInDB(User):
    hashed_password: str
    oauth_provider: Optional[str] = None  # "google", "microsoft", or None for local auth
    oauth_id: Optional[str] = None  # Unique ID from OAuth provider
    oauth_email: Optional[str] = None  # Email from OAuth provider


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    username: str
    full_name: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None
