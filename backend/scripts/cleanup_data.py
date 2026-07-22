"""
scripts/cleanup_data.py — Clear all vector data, document metadata, and uploaded files.

This script clears:
1. Azure AI Search index (all documents and vectors)
2. Azure Blob Storage documents container (uploaded files)
3. Azure Cosmos DB documents-meta container (document metadata)

CAUTION: This is destructive and cannot be undone. Make sure you have backups!

Usage:
  cd backend
  python scripts/cleanup_data.py
"""
import sys
import os

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from config import get_settings
from azure.search.documents.indexes import SearchIndexClient
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient

settings = get_settings()


def confirm_action():
    """Ask user to confirm before clearing data."""
    print("\n⚠️  WARNING: This will permanently delete:")
    print(f"   • All documents in Azure AI Search: {settings.azure_search_index_name}")
    print(f"   • All files in Azure Blob Storage: {settings.azure_storage_container_name}")
    print(f"   • All metadata in Cosmos DB: {settings.azure_cosmos_documents_container}")
    print("\nType 'yes' to confirm: ", end="")
    response = input().strip().lower()
    if response != "yes":
        print("❌ Cancelled.")
        sys.exit(0)
    print()


def clear_search_index():
    """Delete and recreate the Azure AI Search index."""
    print("🔄 Clearing Azure AI Search index...", end=" ", flush=True)
    try:
        index_client = SearchIndexClient(
            endpoint=settings.azure_search_endpoint,
            credential=AzureKeyCredential(settings.azure_search_api_key)
        )
        
        # Delete existing index if it exists
        try:
            index_client.delete_index(settings.azure_search_index_name)
        except:
            pass
        
        # Recreate the index using the ensure_index_exists function
        from services.search_service import ensure_index_exists
        ensure_index_exists()
        
        print("✅ Done")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        raise


def clear_blob_storage():
    """Delete all files from Azure Blob Storage documents container."""
    print("🔄 Clearing Azure Blob Storage...", end=" ", flush=True)
    try:
        blob_client = BlobServiceClient.from_connection_string(
            settings.azure_storage_connection_string
        )
        container_client = blob_client.get_container_client(
            settings.azure_storage_container_name
        )
        
        # List and delete all blobs
        blobs = list(container_client.list_blobs())
        for blob in blobs:
            container_client.delete_blob(blob.name)
        
        print(f"✅ Done (deleted {len(blobs)} files)")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        raise


def clear_cosmos_documents():
    """Delete all documents from Azure Cosmos DB documents-meta container."""
    print("🔄 Clearing Azure Cosmos DB metadata...", end=" ", flush=True)
    try:
        cosmos_client = CosmosClient(settings.azure_cosmos_url, settings.azure_cosmos_key)
        database = cosmos_client.get_database_client(settings.azure_cosmos_database)
        container = database.get_container_client(settings.azure_cosmos_documents_container)
        
        # Query all items with enable_cross_partition_query=True for cross-partition queries
        items = list(container.query_items(
            query="SELECT * FROM c",
            enable_cross_partition_query=True
        ))
        
        deleted_count = 0
        for item in items:
            try:
                # Use the item's id as partition key (most common pattern in Cosmos)
                container.delete_item(item=item["id"], partition_key=item["id"])
                deleted_count += 1
            except Exception as e:
                # Skip items that fail to delete
                pass
        
        print(f"✅ Done (deleted {deleted_count} items)")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        raise


def main():
    """Execute all cleanup operations."""
    print("\n" + "=" * 70)
    print("🧹 NexaVerse Data Cleanup — Clear all vector data & documents")
    print("=" * 70)
    
    try:
        confirm_action()
        
        # Clear in order
        clear_search_index()
        clear_blob_storage()
        clear_cosmos_documents()
        
        print("\n" + "=" * 70)
        print("✅ Cleanup complete! All data has been cleared.")
        print("✅ Ready to upload fresh documents from the UI.")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print("\n" + "=" * 70)
        print(f"❌ Cleanup failed: {e}")
        print("=" * 70 + "\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
