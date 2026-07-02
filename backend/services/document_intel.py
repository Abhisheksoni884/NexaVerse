"""
services/document_intel.py — Azure AI Document Intelligence text extraction.

Uses the prebuilt-layout model to extract text, tables, and page structure
from PDF, DOCX, JPEG, PNG, and TIFF files.
"""
from typing import List, Dict, Any

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential

from config import get_settings
from utils.logging import logger

settings = get_settings()


def _get_client() -> DocumentIntelligenceClient:
    return DocumentIntelligenceClient(
        endpoint=settings.azure_document_intelligence_endpoint,
        credential=AzureKeyCredential(settings.azure_document_intelligence_key),
    )


async def extract_text_from_file(file_content: bytes, content_type: str) -> Dict[str, Any]:
    """
    Extract text from a document using Azure AI Document Intelligence.

    Returns:
        {
            "full_text": str,              # complete extracted text
            "pages": [                     # per-page content
                {"page_number": 1, "content": "..."},
                ...
            ],
            "page_count": int
        }
    """
    client = _get_client()

    logger.info(f"Starting document analysis (content_type={content_type})")

    # Use prebuilt-layout: extracts text, tables, key-value pairs, and structure
    poller = client.begin_analyze_document(
        model_id="prebuilt-layout",
        body=AnalyzeDocumentRequest(bytes_source=file_content),
    )

    result = poller.result()
    logger.info(f"Document analysis complete. Pages: {len(result.pages or [])}")

    pages_content: List[Dict[str, Any]] = []
    full_text_parts: List[str] = []

    if result.pages:
        for page in result.pages:
            page_number = page.page_number or 1
            page_lines: List[str] = []

            # Extract lines of text from each page
            if page.lines:
                for line in page.lines:
                    if line.content:
                        page_lines.append(line.content)

            page_text = "\n".join(page_lines)
            pages_content.append({
                "page_number": page_number,
                "content": page_text,
            })
            full_text_parts.append(f"[Page {page_number}]\n{page_text}")

    # Also extract table content and append to the relevant page
    if result.tables:
        for table in result.tables:
            if not table.cells:
                continue
            table_rows: Dict[int, List[str]] = {}
            for cell in table.cells:
                row = cell.row_index or 0
                table_rows.setdefault(row, []).append(cell.content or "")

            table_text = "\n".join(" | ".join(row) for row in table_rows.values())

            # Attach to first page of table bounding region
            table_page = 1
            if table.bounding_regions:
                table_page = table.bounding_regions[0].page_number or 1

            for page_data in pages_content:
                if page_data["page_number"] == table_page:
                    page_data["content"] += f"\n\n[Table]\n{table_text}"
                    break

    full_text = "\n\n".join(full_text_parts)

    return {
        "full_text": full_text,
        "pages": pages_content,
        "page_count": len(pages_content),
    }
