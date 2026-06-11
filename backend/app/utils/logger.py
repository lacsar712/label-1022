"""
Logger Utilities - Structured logging for the application
"""
import logging
import sys
from datetime import datetime


class CustomFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    grey = "\x1b[38;21m"
    blue = "\x1b[38;5;39m"
    yellow = "\x1b[38;5;226m"
    red = "\x1b[38;5;196m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"
    
    format_str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    
    FORMATS = {
        logging.DEBUG: grey + format_str + reset,
        logging.INFO: blue + format_str + reset,
        logging.WARNING: yellow + format_str + reset,
        logging.ERROR: red + format_str + reset,
        logging.CRITICAL: bold_red + format_str + reset
    }
    
    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno, self.format_str)
        formatter = logging.Formatter(log_fmt, datefmt="%Y-%m-%d %H:%M:%S")
        return formatter.format(record)


def setup_logger(name: str = "app", level: int = logging.INFO) -> logging.Logger:
    """Setup and return a logger instance"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid adding handlers multiple times
    if not logger.handlers:
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(CustomFormatter())
        logger.addHandler(console_handler)
    
    return logger


# Default application logger
logger = setup_logger("influencer-platform")


def log_request(method: str, path: str, status_code: int, duration_ms: float):
    """Log HTTP request"""
    logger.info(f"{method} {path} - {status_code} - {duration_ms:.2f}ms")


def log_error(error: str, context: dict = None):
    """Log error with context"""
    if context:
        logger.error(f"{error} | Context: {context}")
    else:
        logger.error(error)


def log_db_operation(operation: str, table: str, record_id: int = None):
    """Log database operation"""
    if record_id:
        logger.debug(f"DB {operation} on {table} - ID: {record_id}")
    else:
        logger.debug(f"DB {operation} on {table}")
