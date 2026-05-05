"""add multi-tenancy: tenants, tenant_memberships, tenant_id on all resource tables

Revision ID: c3f9a1d2e5b7
Revises: b1e4b6b7c9d2
Create Date: 2026-05-05 00:00:00.000000

Strategy for existing data
---------------------------
1. Create the two new tables (tenants, tenant_memberships).
2. Insert a single "Default Tenant" to own every existing row.
3. Migrate each user's global role into tenant_memberships.
4. Add tenant_id (nullable) to each resource table, back-fill with 1, then
   set NOT NULL + FK.
5. Fix unique constraints that were previously global but are now per-tenant.
6. Drop the global `role` column from users.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3f9a1d2e5b7"
down_revision = "b1e4b6b7c9d2"
branch_labels = None
depends_on = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _add_tenant_id(table: str) -> None:
    """Add tenant_id (nullable), back-fill = 1, then make NOT NULL + FK."""
    op.add_column(table, sa.Column("tenant_id", sa.Integer(), nullable=True))
    op.execute(f"UPDATE {table} SET tenant_id = 1")
    op.alter_column(table, "tenant_id", nullable=False)
    op.create_foreign_key(
        f"fk_{table}_tenant_id",
        table, "tenants",
        ["tenant_id"], ["tenant_id"],
    )


def _drop_tenant_id(table: str) -> None:
    op.drop_constraint(f"fk_{table}_tenant_id", table, type_="foreignkey")
    op.drop_column(table, "tenant_id")


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade():
    # ── 1. tenants ────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("tenant_id",  sa.Integer(),      nullable=False),
        sa.Column("name",       sa.String(150),     nullable=False),
        sa.Column("slug",       sa.String(80),      nullable=False),
        sa.Column("is_active",  sa.Boolean(),       nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(),      nullable=True),
        sa.PrimaryKeyConstraint("tenant_id"),
        sa.UniqueConstraint("name", name="uq_tenants_name"),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
    )

    # ── 2. Seed the default tenant ─────────────────────────────────────────────
    op.execute(
        "INSERT INTO tenants (name, slug, is_active, created_at) "
        "VALUES ('Default Tenant', 'default', TRUE, NOW())"
    )

    # ── 3. tenant_memberships ─────────────────────────────────────────────────
    op.create_table(
        "tenant_memberships",
        sa.Column("membership_id", sa.Integer(),   nullable=False),
        sa.Column("tenant_id",     sa.Integer(),   nullable=False),
        sa.Column("user_id",       sa.Integer(),   nullable=False),
        sa.Column("role",          sa.String(20),  nullable=False, server_default="viewer"),
        sa.Column("is_active",     sa.Boolean(),   nullable=False, server_default=sa.true()),
        sa.Column("created_at",    sa.DateTime(),  nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.tenant_id"], name="fk_tm_tenant_id"),
        sa.ForeignKeyConstraint(["user_id"],   ["users.user_id"],   name="fk_tm_user_id"),
        sa.PrimaryKeyConstraint("membership_id"),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_tenant_memberships_tenant_user"),
    )

    # ── 4. Migrate existing user roles into tenant_memberships ────────────────
    # Every existing user becomes a member of the Default Tenant (id=1)
    # with their current global role.
    op.execute(
        "INSERT INTO tenant_memberships (tenant_id, user_id, role, is_active, created_at) "
        "SELECT 1, user_id, role, is_active, created_at FROM users"
    )

    # ── 5. Add tenant_id to all resource tables ────────────────────────────────
    for table in ("zones", "devices", "crops", "sensor_readings", "alerts", "predictions"):
        _add_tenant_id(table)

    # Add index on high-volume tables for fast tenant scans
    op.create_index("ix_sensor_readings_tenant_id", "sensor_readings", ["tenant_id"])
    op.create_index("ix_alerts_tenant_id",          "alerts",          ["tenant_id"])
    op.create_index("ix_predictions_tenant_id",     "predictions",     ["tenant_id"])

    # ── 6. Fix unique constraints (global → per-tenant) ───────────────────────
    # zones.name was globally unique; now unique per tenant
    op.drop_constraint("zones_name_key", "zones", type_="unique")
    op.create_unique_constraint("uq_zones_tenant_name", "zones", ["tenant_id", "name"])

    # crops.batch_code was globally unique; now unique per tenant
    op.drop_constraint("crops_batch_code_key", "crops", type_="unique")
    op.create_unique_constraint("uq_crops_tenant_batch_code", "crops", ["tenant_id", "batch_code"])

    # ── 7. Drop global role column from users ─────────────────────────────────
    op.drop_column("users", "role")


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade():
    # ── 7. Restore role column on users ───────────────────────────────────────
    op.add_column("users", sa.Column("role", sa.String(20), nullable=True))
    # Restore each user's role from their Default Tenant membership (if any)
    op.execute(
        "UPDATE users u "
        "SET role = tm.role "
        "FROM tenant_memberships tm "
        "WHERE tm.user_id = u.user_id AND tm.tenant_id = 1"
    )
    op.alter_column("users", "role", nullable=False, server_default="viewer")

    # ── 6. Restore original unique constraints ────────────────────────────────
    op.drop_constraint("uq_crops_tenant_batch_code", "crops",  type_="unique")
    op.create_unique_constraint("crops_batch_code_key", "crops", ["batch_code"])

    op.drop_constraint("uq_zones_tenant_name", "zones", type_="unique")
    op.create_unique_constraint("zones_name_key", "zones", ["name"])

    # ── 5. Remove tenant_id from resource tables ───────────────────────────────
    op.drop_index("ix_predictions_tenant_id",     "predictions")
    op.drop_index("ix_alerts_tenant_id",          "alerts")
    op.drop_index("ix_sensor_readings_tenant_id", "sensor_readings")

    for table in reversed(("zones", "devices", "crops", "sensor_readings", "alerts", "predictions")):
        _drop_tenant_id(table)

    # ── 4 + 3. Drop tenant_memberships ────────────────────────────────────────
    op.drop_table("tenant_memberships")

    # ── 2 + 1. Drop tenants ───────────────────────────────────────────────────
    op.drop_table("tenants")
