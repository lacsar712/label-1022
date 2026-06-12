"""
Lightweight schema migrations for existing databases.
"""
from sqlalchemy import inspect, text

from .database import engine
from .utils.logger import logger


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def run_migrations() -> None:
    """Apply incremental schema changes not handled by create_all()."""
    inspector = inspect(engine)

    if inspector.has_table("users") and not _column_exists("users", "brand_id"):
        with engine.begin() as conn:
            if inspector.has_table("brands"):
                conn.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN brand_id INT NULL AFTER role_id, "
                        "ADD CONSTRAINT fk_users_brand_id "
                        "FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL"
                    )
                )
            else:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN brand_id INT NULL AFTER role_id")
                )
        logger.info("Migration applied: added users.brand_id column")
