"""
services/cosmos_service.py — Azure Cosmos DB operations for audit logs and token tracking.

Uses the synchronous SDK (cosmos SDK doesn't have full async support in all environments).
Two containers in one database:
  - audit-logs      : all application events
  - token-usage     : per-query token consumption
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from azure.cosmos import CosmosClient, PartitionKey, exceptions

from config import get_settings
from models.audit import AuditLog, TokenUsageRecord, TokenUsageSummary
from utils.logging import logger

settings = get_settings()

# Singleton client
_cosmos_client: Optional[CosmosClient] = None


def get_cosmos_client() -> CosmosClient:
    global _cosmos_client
    if _cosmos_client is None:
        _cosmos_client = CosmosClient(
            url=settings.azure_cosmos_url,
            credential=settings.azure_cosmos_key,
        )
    return _cosmos_client


def _get_audit_container():
    client = get_cosmos_client()
    db = client.get_database_client(settings.azure_cosmos_database)
    return db.get_container_client(settings.azure_cosmos_audit_container)


def _get_tokens_container():
    client = get_cosmos_client()
    db = client.get_database_client(settings.azure_cosmos_database)
    return db.get_container_client(settings.azure_cosmos_tokens_container)


def ensure_cosmos_containers() -> None:
    """
    Create Cosmos DB database and containers if they don't exist.
    Call this once at application startup.
    """
    client = get_cosmos_client()

    # Create database
    db = client.create_database_if_not_exists(id=settings.azure_cosmos_database)
    logger.info(f"Cosmos DB database ready: {settings.azure_cosmos_database}")

    # Audit logs container — partitioned by username for efficient per-user queries
    db.create_container_if_not_exists(
        id=settings.azure_cosmos_audit_container,
        partition_key=PartitionKey(path="/username"),
    )
    logger.info(f"Audit container ready: {settings.azure_cosmos_audit_container}")

    # Token usage container — partitioned by username
    db.create_container_if_not_exists(
        id=settings.azure_cosmos_tokens_container,
        partition_key=PartitionKey(path="/username"),
    )
    logger.info(f"Token usage container ready: {settings.azure_cosmos_tokens_container}")


# ── Audit Logging ─────────────────────────────────────────────────────────────

async def write_audit_log(log: AuditLog) -> None:
    """Write a single audit event to Cosmos DB."""
    try:
        container = _get_audit_container()
        item = log.model_dump()
        item["timestamp"] = log.timestamp.isoformat()
        container.upsert_item(item)
    except Exception as e:
        # Audit failures should never crash the application
        logger.error(f"Failed to write audit log: {e}")


async def query_audit_logs(
    username: Optional[str] = None,
    action: Optional[str] = None,
    role: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """Query audit logs with optional filters, pagination, and sorting."""
    try:
        container = _get_audit_container()

        conditions = []
        params = []

        if username:
            conditions.append("c.username = @username")
            params.append({"name": "@username", "value": username})

        if action:
            conditions.append("c.action = @action")
            params.append({"name": "@action", "value": action})

        if role:
            conditions.append("c.role = @role")
            params.append({"name": "@role", "value": role})

        if start_date:
            conditions.append("c.timestamp >= @start_date")
            params.append({"name": "@start_date", "value": start_date.isoformat()})

        if end_date:
            conditions.append("c.timestamp <= @end_date")
            params.append({"name": "@end_date", "value": end_date.isoformat()})

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"SELECT * FROM c {where_clause} ORDER BY c.timestamp DESC OFFSET {(page-1)*page_size} LIMIT {page_size}"

        items = list(container.query_items(query=query, parameters=params, enable_cross_partition_query=True))

        # Get total count for pagination
        count_query = f"SELECT VALUE COUNT(1) FROM c {where_clause}"
        count_result = list(container.query_items(query=count_query, parameters=params, enable_cross_partition_query=True))
        total = count_result[0] if count_result else 0

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except Exception as e:
        logger.error(f"Failed to query audit logs: {e}")
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}


# ── Token Usage Tracking ──────────────────────────────────────────────────────

async def write_token_usage(record: TokenUsageRecord) -> None:
    """Write a token usage record to Cosmos DB."""
    try:
        container = _get_tokens_container()
        now = record.timestamp
        item = record.model_dump()
        item["timestamp"] = now.isoformat()
        # Set time partition strings for easy aggregation queries
        item["date_str"] = now.strftime("%Y-%m-%d")
        item["week_str"] = now.strftime("%Y-W%W")
        item["month_str"] = now.strftime("%Y-%m")
        container.upsert_item(item)
    except Exception as e:
        logger.error(f"Failed to write token usage: {e}")


async def get_user_token_summary(username: str, period: str = "all-time") -> Dict[str, Any]:
    """
    Get aggregated token usage for a user.
    period: "daily" | "weekly" | "monthly" | "all-time"
    """
    try:
        container = _get_tokens_container()
        now = datetime.utcnow()

        period_filter = ""
        if period == "daily":
            period_filter = f"AND c.date_str = '{now.strftime('%Y-%m-%d')}'"
        elif period == "weekly":
            period_filter = f"AND c.week_str = '{now.strftime('%Y-W%W')}'"
        elif period == "monthly":
            period_filter = f"AND c.month_str = '{now.strftime('%Y-%m')}'"

        query = f"""
            SELECT
                SUM(c.total_tokens) AS total_tokens,
                SUM(c.prompt_tokens) AS prompt_tokens,
                SUM(c.completion_tokens) AS completion_tokens,
                COUNT(1) AS total_queries
            FROM c
            WHERE c.username = @username {period_filter}
        """
        results = list(container.query_items(
            query=query,
            parameters=[{"name": "@username", "value": username}],
            partition_key=username,
        ))

        if results and results[0].get("total_tokens") is not None:
            r = results[0]
            return {
                "username": username,
                "period": period,
                "total_tokens": r.get("total_tokens", 0) or 0,
                "prompt_tokens": r.get("prompt_tokens", 0) or 0,
                "completion_tokens": r.get("completion_tokens", 0) or 0,
                "total_queries": r.get("total_queries", 0) or 0,
            }

        return {"username": username, "period": period, "total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_queries": 0}

    except Exception as e:
        logger.error(f"Failed to get token summary for {username}: {e}")
        return {"username": username, "period": period, "total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_queries": 0}


async def get_all_users_token_summary() -> List[Dict[str, Any]]:
    """Admin: get token usage summary aggregated per user."""
    try:
        container = _get_tokens_container()
        query = """
            SELECT
                c.username,
                c.total_tokens,
                c.prompt_tokens,
                c.completion_tokens
            FROM c
        """
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        # Group in python since Cosmos SDK doesn't support multiple aggregates in cross-partition query
        summary_map: Dict[str, Dict[str, Any]] = {}
        for item in items:
            uname = item.get("username")
            if not uname: continue
            
            if uname not in summary_map:
                summary_map[uname] = {
                    "username": uname,
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "query_count": 0,
                    "total_queries": 0
                }
            
            s = summary_map[uname]
            s["total_tokens"] += (item.get("total_tokens") or 0)
            s["prompt_tokens"] += (item.get("prompt_tokens") or 0)
            s["completion_tokens"] += (item.get("completion_tokens") or 0)
            s["query_count"] += 1
            s["total_queries"] += 1

        results = list(summary_map.values())
        results.sort(key=lambda x: x.get("total_tokens", 0) or 0, reverse=True)
        return results
    except Exception as e:
        logger.error(f"Failed to get all-users token summary: {e}")
        return []


async def get_recent_queries(username: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get the most recent chat queries for a user (from audit logs)."""
    try:
        container = _get_audit_container()
        query = f"""
            SELECT c.timestamp, c.details, c.total_tokens, c.session_id, c.success
            FROM c
            WHERE c.username = @username AND c.action = 'chat_query'
            ORDER BY c.timestamp DESC
            OFFSET 0 LIMIT {limit}
        """
        results = list(container.query_items(
            query=query,
            parameters=[{"name": "@username", "value": username}],
            enable_cross_partition_query=True,
        ))
        return results
    except Exception as e:
        logger.error(f"Failed to get recent queries: {e}")
        return []
