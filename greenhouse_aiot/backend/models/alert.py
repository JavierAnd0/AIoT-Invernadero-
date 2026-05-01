"""Alert model — maps to the `alerts` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class Alert(db.Model):
    """Automated alert raised when a sensor reading violates threshold rules."""

    __tablename__ = "alerts"

    alert_id        = db.Column(db.Integer,     primary_key=True)
    device_id       = db.Column(db.Integer,     db.ForeignKey("devices.device_id"),          nullable=False)
    reading_id      = db.Column(db.BigInteger,  db.ForeignKey("sensor_readings.reading_id"))
    assigned_to     = db.Column(db.Integer,     db.ForeignKey("users.user_id"))
    alert_type      = db.Column(db.String(30),  nullable=False)
    severity        = db.Column(db.String(10),  nullable=False, default="medium")
    message         = db.Column(db.String(500), nullable=False)
    measured_value  = db.Column(db.Numeric(10, 2))
    threshold_value = db.Column(db.Numeric(10, 2))
    status          = db.Column(db.String(20),  nullable=False, default="open")
    resolved_at     = db.Column(db.DateTime)
    created_at      = db.Column(db.DateTime,    default=datetime.utcnow)

    VALID_TYPES: frozenset[str] = frozenset({
        "temperature", "humidity", "ph", "light",
        "co2", "soil_moisture", "device_offline", "prediction",
    })
    VALID_SEVERITIES: frozenset[str] = frozenset({"low", "medium", "high", "critical"})
    VALID_STATUSES:   frozenset[str] = frozenset({"open", "acknowledged", "resolved", "dismissed"})

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict.

        Field name aliases follow D3 frontend conventions:
          type      ← alert_type
          measured  ← measured_value
          threshold ← threshold_value
        """
        return {
            "alert_id":       self.alert_id,
            "device_id":      self.device_id,
            "reading_id":     self.reading_id,
            "assigned_to":    self.assigned_to,
            "alert_type":     self.alert_type,
            "type":           self.alert_type,
            "severity":       self.severity,
            "message":        self.message,
            "measured_value": float(self.measured_value)  if self.measured_value  is not None else None,
            "measured":       float(self.measured_value)  if self.measured_value  is not None else None,
            "threshold_value": float(self.threshold_value) if self.threshold_value is not None else None,
            "threshold":      float(self.threshold_value) if self.threshold_value is not None else None,
            "status":         self.status,
            "resolved_at":    self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Alert {self.alert_id} {self.alert_type} {self.severity}>"
