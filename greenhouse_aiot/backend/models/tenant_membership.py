"""TenantMembership model — maps to the `tenant_memberships` table.

Replaces the global `users.role` column.  A user can belong to multiple
tenants with a different role in each one.
"""

from datetime import datetime

from models import db


class TenantMembership(db.Model):
    """Association between a User and a Tenant, carrying the per-tenant role."""

    __tablename__ = "tenant_memberships"

    membership_id = db.Column(db.Integer,  primary_key=True)
    tenant_id     = db.Column(db.Integer,  db.ForeignKey("tenants.tenant_id"), nullable=False)
    user_id       = db.Column(db.Integer,  db.ForeignKey("users.user_id"),     nullable=False)
    role          = db.Column(db.String(20), nullable=False, default="viewer")
    is_active     = db.Column(db.Boolean,  nullable=False, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("tenant_id", "user_id", name="uq_tenant_memberships_tenant_user"),
    )

    VALID_ROLES: frozenset[str] = frozenset({"admin", "operator", "viewer"})

    def to_dict(self) -> dict:
        return {
            "membership_id": self.membership_id,
            "tenant_id":     self.tenant_id,
            "user_id":       self.user_id,
            "role":          self.role,
            "is_active":     self.is_active,
            "created_at":    self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<TenantMembership user={self.user_id} tenant={self.tenant_id} role={self.role}>"
