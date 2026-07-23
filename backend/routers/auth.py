"""
routers/auth.py — Authentication endpoints.

POST /auth/login  → returns JWT access token
GET  /auth/me     → returns current user info
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status

from core.auth import authenticate_user, create_access_token, get_current_user
from config import get_settings
from models.user import User, Token, LoginRequest
from models.audit import AuditLog, AuditAction
from services.cosmos_service import write_audit_log
from utils.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=Token)
async def login(request: Request, credentials: LoginRequest):
    """
    Authenticate with username + password.
    Returns a JWT Bearer token valid for JWT_ACCESS_TOKEN_EXPIRE_MINUTES.

    Demo credentials:
      admin   / admin123
      analyst / analyst123
      viewer  / viewer123
    """
    user = authenticate_user(credentials.username, credentials.password)

    if not user:
        # Log failed login attempt
        await write_audit_log(AuditLog(
            username=credentials.username,
            role="unknown",
            action=AuditAction.LOGIN,
            resource="auth",
            ip_address=request.client.host if request.client else None,
            details="Failed login attempt",
            success=False,
        ))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )

    # Log successful login
    await write_audit_log(AuditLog(
        username=user.username,
        role=user.role,
        action=AuditAction.LOGIN,
        resource="auth",
        ip_address=request.client.host if request.client else None,
        details="Successful login",
        success=True,
    ))

    logger.info(f"User '{user.username}' logged in successfully")

    return Token(
        access_token=access_token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
