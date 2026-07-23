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


def get_role_logger(role: str, session_id: str = "") -> logging.Logger:
    """
    Return (or create) a logger that writes to:
      logs/<YYYY-MM-DD>/<role>_HHMM.log
    
    Example: logs/2026-07-23/admin_1530.log (IST time)

    The filename uses the current time (HHMM format in IST) when the logger is created.
    This happens when the user logs in, so it represents the login time in Indian Standard Time.
    Format: HHMM (24-hour IST) for Windows filename compatibility (colons not allowed).

    Log rotation: each session file caps at 5 MB (keeps 1 backup).
    A new date folder is created automatically at midnight IST.
    """
    # Create a unique key combining role and session_id
    logger_key = f"{role}:{session_id}" if session_id else role

    with _role_lock:
        if logger_key in _role_session_loggers:
            return _role_session_loggers[logger_key]

        # Build logs/2026-07-23/<role>_HHMM.log using IST
        date_str = datetime.now(IST).strftime("%Y-%m-%d")
        time_str = datetime.now(IST).strftime("%H%M")  # No colon for Windows compatibility
        date_dir = LOGS_ROOT / date_str
        date_dir.mkdir(parents=True, exist_ok=True)

        # Format filename as role_HHMM.log (e.g., admin_1530.log in IST)
        log_filename = f"{role}_{time_str}.log"
        logger_namespace = f"role.{role}.{session_id}" if session_id else f"role.{role}"

        log_path = date_dir / log_filename

        # Create a dedicated logger namespaced
        role_session_logger = logging.getLogger(logger_namespace)
        role_session_logger.setLevel(logging.DEBUG)
        role_session_logger.propagate = False  # Don't bubble up to root logger

        if not role_session_logger.handlers:
            file_handler = RotatingFileHandler(
                log_path,
                maxBytes=5 * 1024 * 1024,  # 5 MB
                backupCount=1,
                encoding="utf-8",
            )
            file_handler.setFormatter(SessionFormatter())
            role_session_logger.addHandler(file_handler)

            # Also mirror logs to stdout at DEBUG level
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.DEBUG)
            console_handler.setFormatter(SessionFormatter())
            role_session_logger.addHandler(console_handler)

        _role_session_loggers[logger_key] = role_session_logger
        if session_id:
            role_session_logger.info(f"Session log started — role={role} session={session_id}")
        else:
            role_session_logger.info(f"Role log started — role={role}")
        return role_session_logger
