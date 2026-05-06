"""Ensure language and theme columns exist in users table.

This script runs on startup to ensure database columns exist.
Can be removed after migration is confirmed.
"""

import logging
from sqlalchemy import text, inspect

from app import create_app
from models import db

logger = logging.getLogger(__name__)


def ensure_user_preferences_columns():
    """Add language and theme columns if they don't exist."""
    app = create_app('production')
    
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns('users')]
        
        if 'language' not in columns:
            logger.info("Adding language column to users table")
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'en'"
            ))
            db.session.commit()
            logger.info("Language column added successfully")
        else:
            logger.info("Language column already exists")
        
        if 'theme' not in columns:
            logger.info("Adding theme column to users table")
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN theme VARCHAR(10) NOT NULL DEFAULT 'system'"
            ))
            db.session.commit()
            logger.info("Theme column added successfully")
        else:
            logger.info("Theme column already exists")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    ensure_user_preferences_columns()
    print("Database columns check completed")