"""
services/content_safety.py — Azure AI Content Safety text analysis.

Checks both user input and AI output for harmful content before processing/returning.

Performance optimisations:
  - Singleton ContentSafetyClient (avoids recreating on every call)
  - asyncio.to_thread wraps the synchronous SDK so the event loop is never blocked
  - In-memory LRU cache (max 256 entries, 10-minute TTL) for input-text safety results
    so repeated or near-identical queries skip the round-trip entirely
"""
import asyncio
import hashlib
import time
from typing import Tuple, Optional

from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeTextOptions, TextCategory
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

from config import get_settings
from utils.logging import logger

settings = get_settings()

# Threshold above which content is considered unsafe (0-6 scale in Azure Content Safety)
SAFETY_THRESHOLD = 2

# ── Singleton client ───────────────────────────────────────────────────────────
_client: Optional[ContentSafetyClient] = None


def _get_client() -> ContentSafetyClient:
    """Return the singleton ContentSafetyClient, creating it on first call."""
    global _client
    if _client is None:
        _client = ContentSafetyClient(
            endpoint=settings.azure_content_safety_endpoint,
            credential=AzureKeyCredential(settings.azure_content_safety_key),
        )
    return _client


# ── In-memory safety cache ─────────────────────────────────────────────────────
# Key: SHA-256 of first 500 chars of text  →  Value: (is_safe, reason, expiry_ts)
_CACHE_TTL_SECONDS = 600       # 10 minutes
_CACHE_MAX_SIZE    = 256

_safety_cache: dict[str, tuple[bool, Optional[str], float]] = {}


def _cache_key(text: str) -> str:
    return hashlib.sha256(text[:500].encode()).hexdigest()


def _cache_get(key: str) -> Optional[tuple[bool, Optional[str]]]:
    entry = _safety_cache.get(key)
    if entry and entry[2] > time.monotonic():
        return entry[0], entry[1]
    if entry:
        _safety_cache.pop(key, None)  # expired — evict
    return None


def _cache_set(key: str, is_safe: bool, reason: Optional[str]) -> None:
    if len(_safety_cache) >= _CACHE_MAX_SIZE:
        # Evict the oldest entry (first inserted key)
        try:
            oldest = next(iter(_safety_cache))
            _safety_cache.pop(oldest, None)
        except StopIteration:
            pass
    _safety_cache[key] = (is_safe, reason, time.monotonic() + _CACHE_TTL_SECONDS)


# ── Core sync worker (runs inside a thread) ────────────────────────────────────

def _analyze_text_sync(text: str) -> Tuple[bool, Optional[str]]:
    """
    Synchronous content safety check — intended to be called via asyncio.to_thread.
    Never call this directly from async code.
    """
    client = _get_client()
    truncated_text = text[:10000]

    request = AnalyzeTextOptions(
        text=truncated_text,
        categories=[
            TextCategory.HATE,
            TextCategory.SELF_HARM,
            TextCategory.SEXUAL,
            TextCategory.VIOLENCE,
        ],
    )

    response = client.analyze_text(request)
    violations = []

    for category_result in [
        response.hate_result,
        response.self_harm_result,
        response.sexual_result,
        response.violence_result,
    ]:
        if category_result and category_result.severity >= SAFETY_THRESHOLD:
            violations.append(
                f"{category_result.category.value} (severity: {category_result.severity})"
            )

    if violations:
        reason = f"Content flagged for: {', '.join(violations)}"
        return False, reason

    return True, None


# ── Public async API ───────────────────────────────────────────────────────────

async def analyze_text(text: str) -> Tuple[bool, Optional[str]]:
    """
    Analyze text for harmful content using Azure AI Content Safety.

    - Results are cached for 10 minutes (keyed by SHA-256 of first 500 chars).
    - The blocking SDK call is offloaded to a thread pool via asyncio.to_thread
      so the event loop is never stalled.

    Returns:
        (is_safe: bool, reason: Optional[str])
        - is_safe=True  → content is safe to process/return
        - is_safe=False → content was flagged; reason explains what category
    """
    key = _cache_key(text)
    cached = _cache_get(key)
    if cached is not None:
        logger.debug("Content safety cache hit")
        return cached

    try:
        is_safe, reason = await asyncio.to_thread(_analyze_text_sync, text)

        if not is_safe:
            logger.warning(f"Content safety violation detected: {reason}")

        _cache_set(key, is_safe, reason)
        return is_safe, reason

    except HttpResponseError as e:
        logger.error(f"Content Safety API error: {e}")
        # Fail open — log and allow through
        return True, None
    except Exception as e:
        logger.error(f"Unexpected content safety error: {e}")
        return True, None


UNSAFE_RESPONSE_MESSAGE = (
    "I'm sorry, but I cannot process this request as it contains content that violates our safety guidelines. "
    "Please rephrase your question and try again."
)
