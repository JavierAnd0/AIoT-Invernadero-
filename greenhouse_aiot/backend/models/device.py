"""Device model — maps to the `devices` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class Device(db.Model):
    """Physical or simulated IoT sensor node deployed in a zone."""

    __tablename__ = "devices"

    device_id        = db.Column(db.Integer,     primary_key=True)
    tenant_id        = db.Column(db.Integer,     db.ForeignKey("tenants.tenant_id"), nullable=False)
    zone_id          = db.Column(db.Integer,     db.ForeignKey("zones.zone_id"), nullable=False)
    registered_by    = db.Column(db.Integer,     db.ForeignKey("users.user_id"), nullable=False)
    name             = db.Column(db.String(100), nullable=False)
    serial_number    = db.Column(db.String(60),  unique=True)
    device_type      = db.Column(db.String(20),  nullable=False, default="simulated")
    status           = db.Column(db.String(20),  nullable=False, default="online")
    firmware_version = db.Column(db.String(20))
    last_seen_at     = db.Column(db.DateTime)
    created_at       = db.Column(db.DateTime,    default=datetime.utcnow)

    VALID_TYPES:    frozenset[str] = frozenset({"sensor_node", "actuator", "gateway", "simulated"})
    VALID_STATUSES: frozenset[str] = frozenset({"online", "offline", "error", "maintenance"})

    # ── Relationships ─────────────────────────────────────────────────────────
    readings    = db.relationship("SensorReading", backref="device", lazy=True)
    alerts      = db.relationship("Alert",         backref="device", lazy=True)
    predictions = db.relationship("Prediction",    backref="device", lazy=True)

    def to_dict(self, include_last_reading: bool = False) -> dict:
        """Serialise to a JSON-safe dict.

        Field names follow D3 frontend conventions:
          serial   ← serial_number
          type     ← device_type
          firmware ← firmware_version
          last_seen← last_seen_at
        """
        data: dict = {
            "device_id":    self.device_id,
            "tenant_id":    self.tenant_id,
            "zone_id":      self.zone_id,
            "registered_by": self.registered_by,
            "name":         self.name,
            "serial":       self.serial_number,
            "serial_number": self.serial_number,
            "type":         self.device_type,
            "device_type":  self.device_type,
            "status":       self.status,
            "firmware":     self.firmware_version,
            "firmware_version": self.firmware_version,
            "last_seen":    self.last_seen_at.isoformat() if self.last_seen_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }
        if include_last_reading:
            last = (
                SensorReading.query
                .filter_by(device_id=self.device_id)
                .order_by(SensorReading.recorded_at.desc())
                .first()
            )
            data["last_reading"] = last.to_dict() if last else None
        return data

    def __repr__(self) -> str:
        return f"<Device {self.name} ({self.status})>"


# Lazy import to avoid circular dependency
from models.sensor_reading import SensorReading  # noqa: E402
