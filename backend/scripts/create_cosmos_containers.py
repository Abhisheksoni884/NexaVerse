"""
scripts/create_cosmos_containers.py — One-time setup script for Cosmos DB.

Run this once to create the database and containers:
  python scripts/create_cosmos_containers.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from services.cosmos_service import ensure_cosmos_containers
from utils.logging import logger

if __name__ == "__main__":
    logger.info("Setting up Cosmos DB database and containers...")
    try:
        ensure_cosmos_containers()
        logger.info("Done! Cosmos DB is ready.")
    except Exception as e:
        logger.error(f"Failed to setup Cosmos DB: {e}")
        sys.exit(1)
