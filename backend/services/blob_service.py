"""
services/blob_service.py — Azure Blob Storage operations.

Handles: file upload, SAS URL generation, blob deletion.
Uses azure-storage-blob v12 SDK with connection string authentication.
"""
import uuid
from datetime import datetime, timedelta, timezone

from azure.storage.blob import (
    BlobServiceClient,
    BlobSasPermissions,
    generate_blob_sas,
)
from azure.core.exceptions import ResourceNotFoundError

from config import get_settings
from utils.logging import logger

settings = get_settings()


def _get_blob_service_client() -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(settings.azure_storage_connection_string)


async def upload_file_to_blob(
    file_content: bytes,
    filename: str,
    content_type: str,
) -> dict:
    """
    Upload a file to Azure Blob Storage.

    Returns:
        dict with blob_name, blob_url, container_name
    """
    # Generate a unique blob name to avoid collisions
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    blob_name = f"{uuid.uuid4()}.{ext}"

    client = _get_blob_service_client()
    container_client = client.get_container_client(settings.azure_storage_container_name)

    # Create container if it doesn't exist
    try:
        container_client.create_container()
    except Exception:
        pass  # Already exists

    blob_client = container_client.get_blob_client(blob_name)

    blob_client.upload_blob(
        file_content,
        overwrite=True,
        content_settings=None,
    )

    blob_url = blob_client.url
    logger.info(f"Uploaded blob: {blob_name} ({len(file_content)} bytes)")

    return {
        "blob_name": blob_name,
        "blob_url": blob_url,
        "container_name": settings.azure_storage_container_name,
    }


async def delete_blob(blob_name: str) -> bool:
    """Delete a blob from storage. Returns True if deleted, False if not found."""
    try:
        client = _get_blob_service_client()
        blob_client = client.get_blob_client(
            container=settings.azure_storage_container_name,
            blob=blob_name,
        )
        blob_client.delete_blob()
        logger.info(f"Deleted blob: {blob_name}")
        return True
    except ResourceNotFoundError:
        logger.warning(f"Blob not found for deletion: {blob_name}")
        return False
    except Exception as e:
        logger.error(f"Error deleting blob {blob_name}: {e}")
        return False


def get_blob_name_from_url(blob_url: str) -> str:
    """Extract the blob name from a full Azure Blob URL."""
    # URL format: https://<account>.blob.core.windows.net/<container>/<blob_name>
    parts = blob_url.split("/")
    return parts[-1] if parts else blob_url
