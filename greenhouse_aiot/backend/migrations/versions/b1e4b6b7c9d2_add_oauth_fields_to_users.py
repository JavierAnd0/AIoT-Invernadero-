"""add oauth fields to users

Revision ID: b1e4b6b7c9d2
Revises: 71064b266f1d
Create Date: 2026-05-04 01:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b1e4b6b7c9d2"
down_revision = "71064b266f1d"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(length=20), nullable=False, server_default="local"),
    )
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
    )
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])
    op.alter_column("users", "auth_provider", server_default=None)


def downgrade():
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")
