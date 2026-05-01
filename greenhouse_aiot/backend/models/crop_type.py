"""CropType model — maps to the `crop_types` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class CropType(db.Model):
    """Catalog entry for one crop species with its optimal growing parameters."""

    __tablename__ = "crop_types"

    crop_type_id    = db.Column(db.Integer,       primary_key=True)
    name            = db.Column(db.String(100),   nullable=False, unique=True)
    scientific_name = db.Column(db.String(150))
    description     = db.Column(db.Text)
    temp_min        = db.Column(db.Numeric(5,  2), nullable=False)
    temp_max        = db.Column(db.Numeric(5,  2), nullable=False)
    temp_optimal    = db.Column(db.Numeric(5,  2), nullable=False)
    humidity_min    = db.Column(db.Numeric(5,  2), nullable=False)
    humidity_max    = db.Column(db.Numeric(5,  2), nullable=False)
    ph_min          = db.Column(db.Numeric(4,  2), nullable=False)
    ph_max          = db.Column(db.Numeric(4,  2), nullable=False)
    light_min_lux   = db.Column(db.Numeric(10, 2))
    light_max_lux   = db.Column(db.Numeric(10, 2))
    growth_days     = db.Column(db.Integer)
    created_at      = db.Column(db.DateTime,       default=datetime.utcnow)

    # ── Relationships ─────────────────────────────────────────────────────────
    crops = db.relationship("Crop", backref="crop_type", lazy=True)

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict."""
        return {
            "crop_type_id":    self.crop_type_id,
            "name":            self.name,
            "scientific_name": self.scientific_name,
            "description":     self.description,
            "temp_min":        float(self.temp_min),
            "temp_max":        float(self.temp_max),
            "temp_optimal":    float(self.temp_optimal),
            "humidity_min":    float(self.humidity_min),
            "humidity_max":    float(self.humidity_max),
            "ph_min":          float(self.ph_min),
            "ph_max":          float(self.ph_max),
            "light_min_lux":   float(self.light_min_lux)  if self.light_min_lux  is not None else None,
            "light_max_lux":   float(self.light_max_lux)  if self.light_max_lux  is not None else None,
            "growth_days":     self.growth_days,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<CropType {self.name}>"
