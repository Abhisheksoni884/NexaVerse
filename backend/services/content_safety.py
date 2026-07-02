"""
services/content_safety.py — Azure AI Content Safety text analysis.

Checks both user input and AI output for harmful content before processing/returning.
"""
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


def _get_client() -> ContentSafetyClient:
    return ContentSafetyClient(
        endpoint=settings.azure_content_safety_endpoint,
        credential=AzureKeyCredential(settings.azure_content_safety_key),
    )


async def analyze_text(text: str) -> Tuple[bool, Optional[str]]:
    """
    Analyze text for harmful content using Azure AI Content Safety.

    Returns:
        (is_safe: bool, reason: Optional[str])
        - is_safe=True means the content is safe to process/return
        - is_safe=False means the content was flagged; reason explains what category
    """
    try:
        client = _get_client()

        # Truncate to 10,000 chars (API limit)
        truncated_text = text[:10000]

        request = AnalyzeTextOptions(
            text=truncated_text,
            categories=[TextCategory.HATE, TextCategory.SELF_HARM, TextCategory.SEXUAL, TextCategory.VIOLENCE],
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
                violations.append(f"{category_result.category.value} (severity: {category_result.severity})")

        if violations:
            reason = f"Content flagged for: {', '.join(violations)}"
            logger.warning(f"Content safety violation detected: {reason}")
            return False, reason

        return True, None

    except HttpResponseError as e:
        logger.error(f"Content Safety API error: {e}")
        # On API error, allow through (fail open) — log and continue
        return True, None
    except Exception as e:
        logger.error(f"Unexpected content safety error: {e}")
        return True, None


UNSAFE_RESPONSE_MESSAGE = (
    "I'm sorry, but I cannot process this request as it contains content that violates our safety guidelines. "
    "Please rephrase your question and try again."
)
