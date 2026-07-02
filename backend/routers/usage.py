"""
routers/usage.py — Personal token usage and recent queries for the current user.

Endpoints:
  GET /usage/me                  → personal token usage summary
  GET /usage/me/recent-queries   → recent chat queries
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query

from core.auth import get_current_user
from models.user import User
from services.cosmos_service import get_user_token_summary, get_recent_queries

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.get("/me")
async def get_my_usage(
    period: str = Query("all-time", regex="^(daily|weekly|monthly|all-time)$"),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's token usage summary.
    period: "daily" | "weekly" | "monthly" | "all-time"
    """
    daily = await get_user_token_summary(current_user.username, "daily")
    weekly = await get_user_token_summary(current_user.username, "weekly")
    monthly = await get_user_token_summary(current_user.username, "monthly")
    all_time = await get_user_token_summary(current_user.username, "all-time")

    return {
        "username": current_user.username,
        "role": current_user.role,
        "periods": {
            "daily": daily,
            "weekly": weekly,
            "monthly": monthly,
            "all_time": all_time,
        },
    }


@router.get("/me/recent-queries")
async def get_my_recent_queries(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's most recent chat queries."""
    queries = await get_recent_queries(current_user.username, limit=limit)
    return {
        "username": current_user.username,
        "queries": queries,
    }
