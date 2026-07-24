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
from datetime import datetime, timezone, timedelta
from pathlib import Path
from logging.handlers import RotatingFileHandler

# India Standard Time (IST) is UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))

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
            "timestamp": datetime.now(IST).isoformat(),
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
        ts = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
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


# ── Per-role session file logger ───────────────────────────────────────────────

_role_session_loggers: dict[str, logging.Logger] = {}
_role_lock = threading.Lock()


def get_user_logger(username: str, session_id: str = "") -> logging.Logger:
    """
    Return (or create) a logger that writes to:
      logs/<YYYY-MM-DD>/<username>.log
    
    Example: logs/2026-07-23/admin.log (IST time)

    Log rotation: each session file caps at 5 MB (keeps 1 backup).
    A new date folder is created automatically at midnight IST.
    """
    # Create a unique key combining username and session_id
    logger_key = f"{username}:{session_id}" if session_id else username

    with _role_lock:
        if logger_key in _role_session_loggers:
            return _role_session_loggers[logger_key]

        # Build logs/2026-07-23/<username>.log using IST
        date_str = datetime.now(IST).strftime("%Y-%m-%d")
        date_dir = LOGS_ROOT / date_str
        date_dir.mkdir(parents=True, exist_ok=True)

        # Format filename as username.log (e.g., admin.log in IST)
        log_filename = f"{username}.log"
        logger_namespace = f"user.{username}.{session_id}" if session_id else f"user.{username}"

        log_path = date_dir / log_filename

        # Create a dedicated logger namespaced
        user_session_logger = logging.getLogger(logger_namespace)
        user_session_logger.setLevel(logging.DEBUG)
        user_session_logger.propagate = False  # Don't bubble up to root logger

        if not user_session_logger.handlers:
            file_handler = RotatingFileHandler(
                log_path,
                maxBytes=5 * 1024 * 1024,  # 5 MB
                backupCount=1,
                encoding="utf-8",
            )
            file_handler.setFormatter(SessionFormatter())
            user_session_logger.addHandler(file_handler)

            # Also mirror logs to stdout at DEBUG level
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.DEBUG)
            console_handler.setFormatter(SessionFormatter())
            user_session_logger.addHandler(console_handler)

        _role_session_loggers[logger_key] = user_session_logger
        if session_id:
            user_session_logger.info(f"Session log started — user={username} session={session_id}")
        else:
            user_session_logger.info(f"User log started — user={username}")
        return user_session_logger
