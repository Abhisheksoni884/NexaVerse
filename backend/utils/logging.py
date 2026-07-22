"""
utils/logging.py — Dual-output logging for NexaVerse.

Two loggers work together:
  1. `logger`         — Application-wide logger that writes JSON to stdout
                        (consumed by Azure Monitor / App Insights in production).
  2. `get_role_logger(role)` — Returns a per-role file logger that
                        writes human-readable lines to:
                          logs/<YYYY-MM-DD>/<role>.log

Session log format (plain text, easy to read in any editor):
  [2026-07-22 10:30:01.234] INFO  | Searching knowledge base...
  [2026-07-22 10:30:01.891] INFO  | Embedding cache hit
  [2026-07-22 10:30:02.105] INFO  | Hybrid search returned 5 chunks
  [2026-07-22 10:30:02.110] INFO  | LLM streaming started
  [2026-07-22 10:30:08.441] INFO  | Streaming complete — approx 312 tokens
  [2026-07-22 10:30:08.450] DEBUG | Audit log scheduled (fire-and-forget)
"""
import logging
import json
import sys
import os
import threading
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler

# ── Paths ──────────────────────────────────────────────────────────────────────
# Resolve to backend/logs/ regardless of where uvicorn is launched from
_BACKEND_DIR = Path(__file__).resolve().parent.parent
LOGS_ROOT = _BACKEND_DIR / "logs"
LOGS_ROOT.mkdir(exist_ok=True)

# ── JSON formatter (for console / Azure Monitor) ───────────────────────────────

class JSONFormatter(logging.Formatter):
    """Format log records as JSON for easy parsing in Azure Monitor / App Insights."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


# ── Plain-text formatter (for session log files) ───────────────────────────────

class SessionFormatter(logging.Formatter):
    """
    Human-readable format for per-session log files.
    Example:  [2026-07-22 10:30:01.234] INFO  | Embedding cache hit
    """

    LEVEL_COLORS = {
        "DEBUG":    "DEBUG  ",
        "INFO":     "INFO   ",
        "WARNING":  "WARNING",
        "ERROR":    "ERROR  ",
        "CRITICAL": "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        level = self.LEVEL_COLORS.get(record.levelname, record.levelname)
        msg = record.getMessage()
        line = f"[{ts}] {level} | {msg}"
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


# ── Application-wide logger (JSON → stdout) ────────────────────────────────────

def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure root logger with JSON output to stdout."""
    logger = logging.getLogger("rag_app")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)

    return logger


# Module-level logger — import this in other modules
logger = setup_logging()


# ── Per-role file logger ───────────────────────────────────────────────────────

_role_loggers: dict[str, logging.Logger] = {}
_role_lock = threading.Lock()


def get_role_logger(role: str) -> logging.Logger:
    """
    Return (or create) a logger that writes to:
      logs/<YYYY-MM-DD>/<role>.log

    The file is created the first time this function is called for a given
    role. Subsequent calls return the same logger instance.

    Log rotation: each role file caps at 5 MB (keeps 1 backup).
    A new date folder is created automatically at midnight.
    """
    with _role_lock:
        if role in _role_loggers:
            return _role_loggers[role]

        # Build  logs/2026-07-22/<role>.log
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        date_dir = LOGS_ROOT / date_str
        date_dir.mkdir(parents=True, exist_ok=True)

        log_path = date_dir / f"{role}.log"

        # Create a dedicated logger namespaced under "role.<role>"
        role_logger = logging.getLogger(f"role.{role}")
        role_logger.setLevel(logging.DEBUG)
        role_logger.propagate = False  # Don't bubble up to root logger

        if not role_logger.handlers:
            file_handler = RotatingFileHandler(
                log_path,
                maxBytes=5 * 1024 * 1024,  # 5 MB
                backupCount=1,
                encoding="utf-8",
            )
            file_handler.setFormatter(SessionFormatter())
            role_logger.addHandler(file_handler)

            # Also mirror logs to stdout at DEBUG level
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.DEBUG)
            console_handler.setFormatter(SessionFormatter())
            role_logger.addHandler(console_handler)

        _role_loggers[role] = role_logger
        role_logger.info(f"Role log started — role={role}")
        return role_logger
