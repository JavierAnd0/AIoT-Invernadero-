"""Zone model — maps to the `zones` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class Zone(db.Model):
    """Physical or logical greenhouse section, scoped to a single tenant."""

    __tablename__ = "zones"
    __table_args__ = (
        # Zone names only need to be unique within the same tenant.
        db.UniqueConstraint("tenant_id", "name", name="uq_zones_tenant_name"),
    )

    zone_id     = db.Column(db.Integer,       primary_key=True)
    tenant_id   = db.Column(db.Integer,       db.ForeignKey("tenants.tenant_id"), nullable=False)
    name        = db.Column(db.String(100),   nullable=False)
    description = db.Column(db.Text)
    area_m2     = db.Column(db.Numeric(8, 2))
    is_active   = db.Column(db.Boolean,       nullable=False, default=True)
    created_at  = db.Column(db.DateTime,      default=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    devices = db.relationship("Device", backref="zone", lazy=True)
    crops   = db.relationship("Crop",   backref="zone", lazy=True)

    def to_dict(self, include_devices: bool = False, include_crops: bool = False) -> dict:
        """Serialise to a JSON-safe dict."""
        data: dict = {
            "zone_id":     self.zone_id,
            "tenant_id":   self.tenant_id,
            "name":        self.name,
            "description": self.description,
            "area_m2":     float(self.area_m2) if self.area_m2 is not None else None,
            "is_active":   self.is_active,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }
        if include_devices:
            data["devices"] = [d.to_dict() for d in self.devices]
        if include_crops:
            from models.crop import Crop
            active = [c for c in self.crops if c.status not in {"harvested", "failed"}]
            data["crops"] = [c.to_dict() for c in active]
        return data

    def __repr__(self) -> str:
        return f"<Zone {self.name}>"
