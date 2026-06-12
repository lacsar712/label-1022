"""
Lightweight schema migrations for existing databases.
"""
from datetime import datetime, timedelta

from sqlalchemy import inspect, text

from .database import engine
from .utils.logger import logger


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _shift_stale_sample_dates() -> None:
    """
    Shift old sample data dates (from 2024/2025 etc.) to the current
    year/month so that calendar views always show demo content.
    This is safe to re-run: only shifts dates older than 6 months before today.
    """
    inspector = inspect(engine)
    if not inspector.has_table("collaboration_deliverables"):
        return

    today = datetime.today()

    with engine.begin() as conn:
        row = conn.execute(text(
            "SELECT MIN(published_at) FROM collaboration_deliverables "
            "WHERE published_at IS NOT NULL"
        )).fetchone()

        if not row or not row[0]:
            return

        min_date = row[0]
        if isinstance(min_date, str):
            try:
                min_date = datetime.fromisoformat(min_date)
            except ValueError:
                return

        delta_months = (
            (today.year - min_date.year) * 12 + (today.month - min_date.month)
        )

        if delta_months < 6:
            return

        shift_months = delta_months - 1

        logger.info(
            f"Shifting sample data dates forward by {shift_months} months "
            f"(min published_at={min_date.date()}, today={today.date()})"
        )

        conn.execute(text(
            f"UPDATE collaboration_deliverables SET published_at = "
            f"DATE_ADD(published_at, INTERVAL {shift_months} MONTH) "
            f"WHERE published_at IS NOT NULL"
        ))

        if inspector.has_table("collaborations"):
            conn.execute(text(
                f"UPDATE collaborations SET "
                f"start_date = DATE_ADD(start_date, INTERVAL {shift_months} MONTH), "
                f"end_date = DATE_ADD(end_date, INTERVAL {shift_months} MONTH) "
                f"WHERE start_date IS NOT NULL AND end_date IS NOT NULL"
            ))

        logger.info("Migration applied: sample dates shifted to current year/month")


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

    _shift_stale_sample_dates()
