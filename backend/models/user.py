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
