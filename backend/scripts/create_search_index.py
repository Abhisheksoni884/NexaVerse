"""
scripts/create_search_index.py — One-time setup script to create the Azure AI Search index.

Run this once before starting the application if you want to pre-create the index:
  python scripts/create_search_index.py

The application also calls ensure_index_exists() on startup automatically.
"""
import sys
import os

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from services.search_service import ensure_index_exists
from utils.logging import logger

if __name__ == "__main__":
    logger.info("Creating Azure AI Search index...")
    try:
        ensure_index_exists()
        logger.info("Done! Search index is ready.")
    except Exception as e:
        logger.error(f"Failed to create index: {e}")
        sys.exit(1)
