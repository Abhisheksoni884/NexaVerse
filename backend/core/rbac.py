"""
core/rbac.py — Role-Based Access Control dependency factories.

Usage in routers:
    @router.delete("/documents/{id}")
    async def delete_doc(current_user: User = Depends(require_role(["admin"]))):
        ...
"""
from fastapi import Depends, HTTPException, status
from typing import List

from core.auth import get_current_user
from models.user import User, UserRole


def require_role(allowed_roles: List[str]):
    """
    Returns a FastAPI dependency that enforces the user has one of the allowed roles.
    Raises 403 Forbidden otherwise.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}. Your role: {current_user.role}",
            )
        return current_user
    return role_checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Shortcut dependency — admin only."""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def require_analyst_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Shortcut dependency — admin or analyst."""
    if current_user.role not in [UserRole.admin, UserRole.analyst]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst or Admin access required.",
        )
    return current_user


def get_allowed_roles_for_search(user: User) -> List[str]:
    """
    Returns the roles that should be used as RBAC search filters.
    Admin sees everything. Analyst sees general + analyst docs. Viewer sees only viewer docs.
    """
    if user.role == UserRole.admin:
        return ["admin", "analyst", "viewer"]
    elif user.role == UserRole.analyst:
        return ["analyst", "viewer"]
    else:
        return ["viewer"]
