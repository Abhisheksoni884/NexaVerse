"""
routers/auth.py — Authentication endpoints.

POST /auth/login  → sets JWT in HTTP-only cookie
GET  /auth/me     → returns current user info
POST /auth/logout → clears authentication cookie
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from core.auth import authenticate_user, create_access_token, get_current_user
from config import get_settings
from models.user import User, Token, LoginRequest
from models.audit import AuditLog, AuditAction
from services.cosmos_service import write_audit_log
from utils.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

# Cookie configuration constants
COOKIE_NAME = "auth_token"
COOKIE_SECURE = settings.app_env == "production"  # HTTPS only in production
COOKIE_SAMESITE = "lax"  # Prevent CSRF while allowing cross-site GET requests


@router.post("/login", response_model=Token)
async def login(request: Request, response: Response, credentials: LoginRequest):
    """
    Authenticate with username + password.
    Sets JWT in HTTP-only cookie valid for JWT_ACCESS_TOKEN_EXPIRE_MINUTES.

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

    # Generate simple session ID: session_<timestamp>
    import time
    session_id = f"session_{int(time.time() * 1000) % 1000000}"

    # Set JWT in HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        max_age=settings.jwt_access_token_expire_minutes * 60,  # seconds
        expires=settings.jwt_access_token_expire_minutes * 60,   # seconds from now
        httponly=True,      # Not accessible via JavaScript
        secure=COOKIE_SECURE,  # HTTPS only in production
        samesite=COOKIE_SAMESITE,  # CSRF protection
    )

    # Log successful login
    await write_audit_log(AuditLog(
        username=user.username,
        role=user.role,
        action=AuditAction.LOGIN,
        resource="auth",
        ip_address=request.client.host if request.client else None,
        details=f"Successful login - Session: {session_id}",
        success=True,
    ))

    logger.info(f"User '{user.username}' logged in successfully. Session ID: {session_id}")

    # Return session ID to frontend in response
    token_response = Token(
        access_token=access_token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )
    # Store session_id as JSON in response for frontend to pick up
    response.headers["X-Session-ID"] = session_id
    return token_response


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
async def logout(response: Response):
    """Clear the authentication cookie and log out the user."""
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    logger.info("User logged out. Auth cookie cleared.")
    return {"message": "Logged out successfully"}
