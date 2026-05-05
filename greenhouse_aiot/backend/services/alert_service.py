"""Alert service — evaluates sensor readings against crop thresholds and creates alerts."""

import logging
from datetime import datetime

from models import db
from models.alert import Alert
from models.crop import Crop
from models.crop_type import CropType
from models.sensor_reading import SensorReading

logger = logging.getLogger(__name__)

# ── Parameter metadata ────────────────────────────────────────────────────────

_PARAM_META: dict[str, dict] = {
    "temperature":   {"alert_type": "temperature",   "unit": "°C",   "label": "Temperature"},
    "humidity":      {"alert_type": "humidity",      "unit": "%",    "label": "Humidity"},
    "ph":            {"alert_type": "ph",            "unit": "",     "label": "pH"},
    "light_lux":     {"alert_type": "light",         "unit": " lux", "label": "Light"},
    "co2_ppm":       {"alert_type": "co2",           "unit": " ppm", "label": "CO2"},
    "soil_moisture": {"alert_type": "soil_moisture", "unit": "%",    "label": "Soil moisture"},
}

# General thresholds for co2_ppm and soil_moisture (not crop-specific in D1)
_GENERAL_THRESHOLDS: dict[str, tuple[float, float]] = {
    "co2_ppm":       (400.0, 1500.0),
    "soil_moisture": (40.0,  80.0),
}


def _get_crop_thresholds(zone_id: int) -> list[dict]:
    """Return a list of threshold dicts for all crop types active in *zone_id*."""
    crops = (
        Crop.query
        .filter_by(zone_id=zone_id)
        .filter(Crop.status.notin_(["harvested", "failed"]))
        .all()
    )
    if not crops:
        return []

    seen: set[int] = set()
    thresholds: list[dict] = []
    for crop in crops:
        ct: CropType = crop.crop_type
        if ct.crop_type_id in seen:
            continue
        seen.add(ct.crop_type_id)
        thresholds.append({
            "temperature":   (float(ct.temp_min),     float(ct.temp_max)),
            "humidity":      (float(ct.humidity_min), float(ct.humidity_max)),
            "ph":            (float(ct.ph_min),       float(ct.ph_max)),
            "light_lux":     (
                float(ct.light_min_lux) if ct.light_min_lux is not None else None,
                float(ct.light_max_lux) if ct.light_max_lux is not None else None,
            ),
            "co2_ppm":       _GENERAL_THRESHOLDS["co2_ppm"],
            "soil_moisture": _GENERAL_THRESHOLDS["soil_moisture"],
        })
    return thresholds


def _severity_and_direction(
    value: float, lo: float | None, hi: float | None
) -> tuple[str | None, str]:
    """Return (severity, direction) for *value* vs the range [lo, hi].

    Severity table:
      val > hi  * 1.15  → critical
      hi < val ≤ hi*1.15 → medium
      val < lo  * 0.85  → critical
      lo*0.85 ≤ val < lo → high
      in range            → None (no alert)
    """
    if hi is not None and value > hi * 1.15:
        return "critical", "above"
    if hi is not None and value > hi:
        return "medium", "above"
    if lo is not None and value < lo * 0.85:
        return "critical", "below"
    if lo is not None and value < lo:
        return "high", "below"
    return None, "ok"


def check_and_create_alerts(reading: SensorReading, tenant_id: int) -> list[Alert]:
    """Evaluate *reading* against crop thresholds and persist any triggered alerts.

    Returns the list of Alert objects created.
    """
    # Determine zone via the device relationship
    zone_id: int = reading.device.zone_id
    threshold_sets = _get_crop_thresholds(zone_id)

    created: list[Alert] = []

    for thresholds in threshold_sets:
        for param, meta in _PARAM_META.items():
            value = getattr(reading, param, None)
            if value is None:
                continue
            value = float(value)

            lo, hi = thresholds[param]
            if lo is None and hi is None:
                continue

            severity, direction = _severity_and_direction(value, lo, hi)
            if severity is None:
                continue

            label = meta["label"]
            unit  = meta["unit"]
            threshold_ref = hi if direction == "above" else lo

            if direction == "above":
                msg = (
                    f"{label} {value:.2f}{unit} exceeds max "
                    f"{threshold_ref:.2f}{unit}"
                )
            else:
                msg = (
                    f"{label} {value:.2f}{unit} below minimum "
                    f"{threshold_ref:.2f}{unit}"
                )

            alert = Alert(
                tenant_id=tenant_id,
                device_id=reading.device_id,
                reading_id=reading.reading_id,
                alert_type=meta["alert_type"],
                severity=severity,
                message=msg,
                measured_value=value,
                threshold_value=threshold_ref,
            )
            db.session.add(alert)
            created.append(alert)
            logger.debug("Alert created: %s", msg)

    if created:
        try:
            db.session.flush()
        except Exception:
            logger.exception("Failed to flush alerts")

    return created


def create_prediction_alert(
    device_id: int, predicted_class: str, confidence: float, tenant_id: int
) -> Alert | None:
    """Create a 'prediction' alert when the predicted condition is warning or critical.

    Returns the Alert if created, otherwise None.
    """
    if predicted_class not in {"warning", "critical"}:
        return None

    severity = "high" if predicted_class == "warning" else "critical"
    msg = (
        f"AI prediction: {predicted_class} condition detected "
        f"(confidence {confidence:.1%})"
    )
    alert = Alert(
        tenant_id=tenant_id,
        device_id=device_id,
        alert_type="prediction",
        severity=severity,
        message=msg,
        measured_value=round(confidence, 4),
    )
    db.session.add(alert)
    try:
        db.session.flush()
    except Exception:
        logger.exception("Failed to flush prediction alert")
        return None
    return alert
