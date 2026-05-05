"""SensorReading model — maps to the `sensor_readings` table in D1 schema.sql."""

from datetime import datetime

from models import db


class SensorReading(db.Model):
    """Time-series measurement captured by one IoT device."""

    __tablename__ = "sensor_readings"

    reading_id    = db.Column(db.BigInteger,    primary_key=True, autoincrement=True)
    tenant_id     = db.Column(db.Integer,       db.ForeignKey("tenants.tenant_id"), nullable=False, index=True)
    device_id     = db.Column(db.Integer,       db.ForeignKey("devices.device_id"), nullable=False)
    temperature   = db.Column(db.Numeric(5,  2))
    humidity      = db.Column(db.Numeric(5,  2))
    ph            = db.Column(db.Numeric(4,  2))
    light_lux     = db.Column(db.Numeric(10, 2))
    co2_ppm       = db.Column(db.Numeric(8,  2))
    soil_moisture = db.Column(db.Numeric(5,  2))
    recorded_at   = db.Column(db.DateTime,      nullable=False, default=datetime.utcnow)
    is_simulated  = db.Column(db.Boolean,       nullable=False, default=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    alerts      = db.relationship("Alert",      backref="reading", lazy=True)
    predictions = db.relationship("Prediction", backref="reading", lazy=True)

    # ── Physical bounds from D1 CHECK constraints ─────────────────────────────
    BOUNDS: dict[str, tuple[float | None, float | None]] = {
        "temperature":   (-10.0, 60.0),
        "humidity":      (0.0,  100.0),
        "ph":            (0.0,   14.0),
        "light_lux":     (0.0, None),
        "co2_ppm":       (0.0, None),
        "soil_moisture": (0.0,  100.0),
    }

    @classmethod
    def validate_fields(cls, data: dict) -> list[str]:
        """Return a list of validation error messages, empty if all values are in range."""
        errors: list[str] = []
        for field, (lo, hi) in cls.BOUNDS.items():
            val = data.get(field)
            if val is None:
                continue
            try:
                v = float(val)
            except (TypeError, ValueError):
                errors.append(f"{field} must be numeric.")
                continue
            if lo is not None and v < lo:
                errors.append(f"{field} must be >= {lo} (got {v}).")
            if hi is not None and v > hi:
                errors.append(f"{field} must be <= {hi} (got {v}).")
        return errors

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict."""
        return {
            "reading_id":    self.reading_id,
            "tenant_id":     self.tenant_id,
            "device_id":     self.device_id,
            "temperature":   float(self.temperature)   if self.temperature   is not None else None,
            "humidity":      float(self.humidity)      if self.humidity      is not None else None,
            "ph":            float(self.ph)            if self.ph            is not None else None,
            "light_lux":     float(self.light_lux)     if self.light_lux     is not None else None,
            "co2_ppm":       float(self.co2_ppm)       if self.co2_ppm       is not None else None,
            "soil_moisture": float(self.soil_moisture) if self.soil_moisture is not None else None,
            "recorded_at":   self.recorded_at.isoformat() if self.recorded_at else None,
            "is_simulated":  self.is_simulated,
        }

    def __repr__(self) -> str:
        return f"<SensorReading {self.reading_id} device={self.device_id}>"
