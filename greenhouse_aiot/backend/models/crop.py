"""Crop model — maps to the `crops` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class Crop(db.Model):
    """Active crop batch planted in a specific zone."""

    __tablename__ = "crops"

    crop_id             = db.Column(db.Integer,     primary_key=True)
    zone_id             = db.Column(db.Integer,     db.ForeignKey("zones.zone_id"),           nullable=False)
    crop_type_id        = db.Column(db.Integer,     db.ForeignKey("crop_types.crop_type_id"), nullable=False)
    created_by          = db.Column(db.Integer,     db.ForeignKey("users.user_id"),           nullable=False)
    batch_code          = db.Column(db.String(50),  unique=True)
    quantity            = db.Column(db.Integer,     nullable=False)
    planted_at          = db.Column(db.Date,        nullable=False)
    expected_harvest_at = db.Column(db.Date)
    actual_harvest_at   = db.Column(db.Date)
    status              = db.Column(db.String(20),  nullable=False, default="germinating")
    notes               = db.Column(db.Text)
    created_at          = db.Column(db.DateTime,    default=datetime.utcnow)

    VALID_STATUSES: frozenset[str] = frozenset(
        {"germinating", "growing", "flowering", "harvested", "failed"}
    )

    def to_dict(self, include_zone: bool = False, include_crop_type: bool = False) -> dict:
        """Serialise to a JSON-safe dict."""
        data: dict = {
            "crop_id":             self.crop_id,
            "zone_id":             self.zone_id,
            "crop_type_id":        self.crop_type_id,
            "created_by":          self.created_by,
            "batch_code":          self.batch_code,
            "quantity":            self.quantity,
            "planted_at":          self.planted_at.isoformat() if self.planted_at else None,
            "expected_harvest_at": self.expected_harvest_at.isoformat() if self.expected_harvest_at else None,
            "actual_harvest_at":   self.actual_harvest_at.isoformat() if self.actual_harvest_at else None,
            "status":              self.status,
            "notes":               self.notes,
            "created_at":          self.created_at.isoformat() if self.created_at else None,
        }
        if include_zone and self.zone:
            data["zone"] = self.zone.to_dict()
        if include_crop_type and self.crop_type:
            data["crop_type"] = self.crop_type.to_dict()
        return data

    def __repr__(self) -> str:
        return f"<Crop {self.batch_code or self.crop_id} ({self.status})>"
