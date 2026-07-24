"""
core/oauth.py — OAuth 2.0 provider configuration and token handling.
Supports Google login only.
"""
from datetime import datetime, timedelta
from typing import Optional
import httpx
from jose import jwt

from config import get_settings
from models.user import User, UserRole, UserInDB
from utils.logging import logger

settings = get_settings()


# ── OAuth Provider Configuration ──────────────────────────────────────────────

class GoogleOAuthConfig:
    """Google OAuth 2.0 configuration"""
    CLIENT_ID = settings.google_client_id
    CLIENT_SECRET = settings.google_client_secret
    REDIRECT_URI = settings.google_redirect_uri
    AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
    SCOPES = ["openid", "email", "profile"]


# ── OAuth User Info Models ───────────────────────────────────────────────────

class GoogleUserInfo:
    """Parsed Google OAuth user info"""
    def __init__(self, data: dict):
        self.sub = data.get("sub")
        self.email = data.get("email")
        self.name = data.get("name")
        self.picture = data.get("picture")
        self.email_verified = data.get("email_verified")

    def to_user(self) -> UserInDB:
        """Convert to NexaVerse User"""
        # Use email as username, default to viewer role
        username = self.email.split("@")[0]
        return UserInDB(
            username=username,
            full_name=self.name or self.email,
            role=UserRole.viewer,  # Default role, can be customized
            hashed_password="oauth-google",  # Placeholder for OAuth users
            oauth_provider="google",
            oauth_id=self.sub,
            oauth_email=self.email,
        )


# ── OAuth Token Exchange ──────────────────────────────────────────────────────

async def exchange_google_code_for_token(code: str) -> dict:
    """
    Exchange Google authorization code for access token.
    Returns token response with access_token, id_token, etc.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GoogleOAuthConfig.TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GoogleOAuthConfig.CLIENT_ID,
                    "client_secret": GoogleOAuthConfig.CLIENT_SECRET,
                    "redirect_uri": GoogleOAuthConfig.REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Google token exchange failed: {str(e)}")
            raise


# ── Get User Info from OAuth Provider ──────────────────────────────────────────

async def get_google_user_info(access_token: str) -> GoogleUserInfo:
    """
    Fetch user info from Google using access token.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                GoogleOAuthConfig.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            response.raise_for_status()
            return GoogleUserInfo(response.json())
        except Exception as e:
            logger.error(f"Failed to fetch Google user info: {str(e)}")
            raise


# ── OAuth Login Flow ──────────────────────────────────────────────────────────

async def handle_google_oauth_callback(code: str) -> tuple[User, str]:
    """
    Handle Google OAuth callback.
    Returns (User, JWT token) if successful.
    """
    try:
        # Exchange code for token
        token_response = await exchange_google_code_for_token(code)
        access_token = token_response.get("access_token")
        
        if not access_token:
            raise ValueError("No access token in response")
        
        # Get user info
        google_user = await get_google_user_info(access_token)
        
        # Create/update user in system
        user = google_user.to_user()
        
        # Create JWT token for this user
        jwt_token = create_oauth_access_token(
            data={
                "sub": user.username,
                "role": user.role,
                "oauth_provider": "google",
            }
        )
        
        logger.info(f"Google OAuth login successful for {user.oauth_email}")
        return user, jwt_token
        
    except Exception as e:
        logger.error(f"Google OAuth callback failed: {str(e)}")
        raise


# ── JWT Token Creation for OAuth Users ────────────────────────────────────────

def create_oauth_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token for OAuth users.
    Similar to regular JWT but marked with oauth_provider claim.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.oauth_token_expiry_minutes)
    )
    to_encode.update({"exp": expire, "type": "oauth"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# ── OAuth State Management (for CSRF protection) ────────────────────────────────

def generate_oauth_state() -> str:
    """Generate random state for OAuth CSRF protection"""
    import secrets
    return secrets.token_urlsafe(32)


def verify_oauth_state(stored_state: str, received_state: str) -> bool:
    """Verify OAuth state matches (CSRF protection)"""
    return stored_state == received_state
