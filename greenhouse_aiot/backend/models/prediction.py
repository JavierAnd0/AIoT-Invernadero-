"""Prediction model — maps to the `predictions` table defined in D1 schema.sql."""

from datetime import datetime

from models import db


class Prediction(db.Model):
    """AI model inference result stored for traceability."""

    __tablename__ = "predictions"

    prediction_id     = db.Column(db.Integer,    primary_key=True)
    device_id         = db.Column(db.Integer,    db.ForeignKey("devices.device_id"),          nullable=False)
    reading_id        = db.Column(db.BigInteger, db.ForeignKey("sensor_readings.reading_id"), nullable=False)
    model_name        = db.Column(db.String(100), nullable=False)
    model_version     = db.Column(db.String(20),  nullable=False)
    predicted_class   = db.Column(db.String(20),  nullable=False)
    confidence        = db.Column(db.Numeric(5, 4), nullable=False)
    raw_probabilities = db.Column(db.JSON)
    input_features    = db.Column(db.JSON)
    created_at        = db.Column(db.DateTime,   default=datetime.utcnow)

    VALID_CLASSES: frozenset[str] = frozenset({"optimal", "warning", "critical"})

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict."""
        return {
            "prediction_id":     self.prediction_id,
            "device_id":         self.device_id,
            "reading_id":        self.reading_id,
            "model_name":        self.model_name,
            "model_version":     self.model_version,
            "predicted_class":   self.predicted_class,
            "confidence":        float(self.confidence) if self.confidence is not None else None,
            "raw_probabilities": self.raw_probabilities,
            "input_features":    self.input_features,
            "created_at":        self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Prediction {self.prediction_id} {self.predicted_class} ({self.confidence})>"
