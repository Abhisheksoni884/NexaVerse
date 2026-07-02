"""
routers/admin.py — Admin-only endpoints for audit logs and usage analytics.

Endpoints:
  GET  /admin/audit          → paginated + filtered audit logs
  GET  /admin/audit/export   → CSV or JSON export
  GET  /admin/usage          → all-user token analytics
  GET  /admin/users          → list of demo users with roles
"""
import csv
import io
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from core.rbac import require_admin
from models.user import User
from services.cosmos_service import (
    query_audit_logs,
    get_all_users_token_summary,
)
from core.auth import DEMO_USERS

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/audit")
async def get_audit_logs(
    username: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
):
    """
    Query audit logs with optional filters.
    Supports pagination (page, page_size) and sorting by timestamp (newest first).
    """
    return await query_audit_logs(
        username=username,
        action=action,
        role=role,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )


@router.get("/audit/export")
async def export_audit_logs(
    format: str = Query("json", regex="^(json|csv)$"),
    username: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    _: User = Depends(require_admin),
):
    """
    Export audit logs as JSON or CSV.
    Fetches up to 1000 records for export.
    """
    result = await query_audit_logs(username=username, action=action, page=1, page_size=1000)
    items = result["items"]

    if format == "csv":
        output = io.StringIO()
        if items:
            writer = csv.DictWriter(output, fieldnames=items[0].keys())
            writer.writeheader()
            writer.writerows(items)
        else:
            output.write("No data\n")

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
        )
    else:
        json_content = json.dumps(items, indent=2, default=str)
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=audit_logs.json"},
        )


@router.get("/usage")
async def get_all_usage(
    _: User = Depends(require_admin),
):
    """
    Get token usage summary for all users.
    Returns list sorted by total tokens descending (leaderboard).
    """
    summaries = await get_all_users_token_summary()

    # Estimate cost (text-embedding-3-small: $0.02/1M tokens, gpt-4o: $5/1M prompt, $15/1M completion)
    EMBEDDING_COST_PER_1M = 0.02
    CHAT_PROMPT_COST_PER_1M = 5.0
    CHAT_COMPLETION_COST_PER_1M = 15.0

    enriched = []
    for summary in summaries:
        prompt = summary.get("prompt_tokens", 0) or 0
        completion = summary.get("completion_tokens", 0) or 0
        total = summary.get("total_tokens", 0) or 0

        # Simple cost estimate (approximate)
        estimated_cost_usd = (
            (prompt / 1_000_000) * CHAT_PROMPT_COST_PER_1M
            + (completion / 1_000_000) * CHAT_COMPLETION_COST_PER_1M
        )

        enriched.append({
            **summary,
            "estimated_cost_usd": round(estimated_cost_usd, 4),
        })

    return {
        "users": enriched,
        "total_users": len(enriched),
    }


@router.get("/users")
async def list_users(
    _: User = Depends(require_admin),
):
    """List all registered users with their roles."""
    return [
        {
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "disabled": u.disabled,
        }
        for u in DEMO_USERS.values()
    ]
