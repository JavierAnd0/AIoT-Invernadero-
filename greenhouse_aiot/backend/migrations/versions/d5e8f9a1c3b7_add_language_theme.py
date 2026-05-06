"""add language and theme to users

Revision ID: d5e8f9a1c3b7
Revises: b1e4b6b7c9d2
Create Date: 2026-05-05 00:00:000000

"""

from alembic import op
import sqlalchemy as sa


revision = "d5e8f9a1c3b7"
down_revision = "b1e4b6b7c9d2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("language", sa.String(length=10), nullable=False, server_default="en"),
    )
    op.add_column(
        "users",
        sa.Column("theme", sa.String(length=10), nullable=False, server_default="system"),
    )
    op.alter_column("users", "language", server_default=None)
    op.alter_column("users", "theme", server_default=None)


def downgrade():
    op.drop_column("users", "theme")
    op.drop_column("users", "language")