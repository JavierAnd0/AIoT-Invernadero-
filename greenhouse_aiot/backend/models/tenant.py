"""Tenant model — maps to the `tenants` table."""

from datetime import datetime

from models import db


class Tenant(db.Model):
    """An isolated organisation/customer whose data is completely separate from others."""

    __tablename__ = "tenants"

    tenant_id  = db.Column(db.Integer,      primary_key=True)
    name       = db.Column(db.String(150),  nullable=False, unique=True)
    slug       = db.Column(db.String(80),   nullable=False, unique=True)
    is_active  = db.Column(db.Boolean,      nullable=False, default=True)
    created_at = db.Column(db.DateTime,     default=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    memberships = db.relationship("TenantMembership", backref="tenant", lazy=True)

    def to_dict(self) -> dict:
        return {
            "tenant_id":  self.tenant_id,
            "name":       self.name,
            "slug":       self.slug,
            "is_active":  self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def slugify(name: str) -> str:
        """Convert a display name to a URL-safe slug."""
        import re
        slug = name.lower().strip()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_]+", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        return slug[:80]

    def __repr__(self) -> str:
        return f"<Tenant {self.slug}>"
