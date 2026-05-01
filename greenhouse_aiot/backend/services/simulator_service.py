"""IoT simulator service — generates realistic sensor readings on a schedule.

Uses APScheduler to fire one SensorReading per active simulated device at a
configurable interval. Each reading uses zone-specific baselines plus the same
Gaussian noise parameters as D4 dataset_generator.py.
"""

import logging
import random
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

# ── Global scheduler state ────────────────────────────────────────────────────

_scheduler: BackgroundScheduler | None = None
_JOB_ID = "iot_simulator"

_stats: dict = {
    "running":            False,
    "readings_generated": 0,
    "interval_seconds":   15,
    "last_reading_at":    None,
}

# ── Zone baselines (zone_id → sensor values) ──────────────────────────────────
# Mirrors data.js from D3 and matches dataset_generator.py (D4)

ZONE_BASELINES: dict[int, dict[str, float]] = {
    1: {"temperature": 22.0, "humidity": 72.0, "ph": 6.3, "light_lux": 22000.0, "co2_ppm": 420.0, "soil_moisture": 65.0},
    2: {"temperature": 24.5, "humidity": 68.0, "ph": 6.1, "light_lux": 45000.0, "co2_ppm": 450.0, "soil_moisture": 68.0},
    3: {"temperature": 26.0, "humidity": 58.0, "ph": 6.5, "light_lux": 35000.0, "co2_ppm": 410.0, "soil_moisture": 60.0},
    4: {"temperature": 21.0, "humidity": 70.0, "ph": 6.4, "light_lux": 15000.0, "co2_ppm": 400.0, "soil_moisture": 70.0},
}

_DEFAULT_BASELINE: dict[str, float] = {
    "temperature": 22.0, "humidity": 65.0, "ph": 6.3,
    "light_lux": 25000.0, "co2_ppm": 420.0, "soil_moisture": 65.0,
}

# Gaussian noise std — identical to D4 dataset_generator.py
_NOISE_STD: dict[str, float] = {
    "temperature":   1.5,
    "humidity":      3.0,
    "ph":            0.2,
    "light_lux":   500.0,
    "co2_ppm":      20.0,
    "soil_moisture": 2.0,
}

# Physical clip bounds from D1 CHECK constraints
_PHYS_BOUNDS: dict[str, tuple[float, float]] = {
    "temperature":   (-10.0,  60.0),
    "humidity":      (  0.0, 100.0),
    "ph":            (  0.0,  14.0),
    "light_lux":     (  0.0, 150000.0),
    "co2_ppm":       (  0.0,  5000.0),
    "soil_moisture": (  0.0, 100.0),
}


def _add_noise(value: float, feature: str) -> float:
    """Apply Gaussian noise and clip to physical bounds."""
    std = _NOISE_STD.get(feature, 0.0)
    noisy = value + random.gauss(0, std)
    lo, hi = _PHYS_BOUNDS[feature]
    return round(max(lo, min(hi, noisy)), 2)


# ── Core generation function ──────────────────────────────────────────────────

def _generate_readings(app) -> None:
    """Generate one SensorReading per active simulated device, then run alerts + predictions."""
    from models import db
    from models.device import Device
    from models.sensor_reading import SensorReading
    from services import alert_service, prediction_service
    from models.prediction import Prediction

    with app.app_context():
        devices = Device.query.filter_by(device_type="simulated", status="online").all()

        for device in devices:
            baseline = ZONE_BASELINES.get(device.zone_id, _DEFAULT_BASELINE)

            reading = SensorReading(
                device_id=device.device_id,
                temperature=_add_noise(baseline["temperature"],   "temperature"),
                humidity=_add_noise(   baseline["humidity"],      "humidity"),
                ph=_add_noise(         baseline["ph"],            "ph"),
                light_lux=_add_noise(  baseline["light_lux"],     "light_lux"),
                co2_ppm=_add_noise(    baseline["co2_ppm"],       "co2_ppm"),
                soil_moisture=_add_noise(baseline["soil_moisture"], "soil_moisture"),
                is_simulated=True,
                recorded_at=datetime.utcnow(),
            )
            db.session.add(reading)
            db.session.flush()   # obtain reading_id

            # Update device last_seen_at
            device.last_seen_at = datetime.utcnow()

            # Trigger alert evaluation
            try:
                alert_service.check_and_create_alerts(reading)
            except Exception:
                logger.exception("Alert check failed for device %d", device.device_id)

            # Run AI prediction and persist result
            try:
                features = {
                    "temperature":   float(reading.temperature),
                    "humidity":      float(reading.humidity),
                    "ph":            float(reading.ph),
                    "light_lux":     float(reading.light_lux),
                    "co2_ppm":       float(reading.co2_ppm),
                    "soil_moisture": float(reading.soil_moisture),
                }
                pred_result = prediction_service.run_prediction(features)
                pred = Prediction(
                    device_id=device.device_id,
                    reading_id=reading.reading_id,
                    model_name=pred_result["model_name"],
                    model_version=pred_result["model_version"],
                    predicted_class=pred_result["predicted_class"],
                    confidence=pred_result["confidence"],
                    raw_probabilities=pred_result["raw_probabilities"],
                    input_features=features,
                )
                db.session.add(pred)

                if pred_result["predicted_class"] in {"warning", "critical"}:
                    alert_service.create_prediction_alert(
                        device.device_id,
                        pred_result["predicted_class"],
                        pred_result["confidence"],
                    )
            except Exception:
                logger.exception("Prediction failed for device %d", device.device_id)

        try:
            db.session.commit()
        except Exception:
            logger.exception("Failed to commit simulated readings")
            db.session.rollback()

        _stats["readings_generated"] += len(devices)
        _stats["last_reading_at"] = datetime.utcnow().isoformat()
        logger.debug("Simulator generated %d readings", len(devices))


# ── Public API ────────────────────────────────────────────────────────────────

def start(interval_seconds: int = 15, app=None) -> dict:
    """Start the background scheduler.

    Args:
        interval_seconds: How often to generate readings (5–120).
        app: The Flask application instance (required for app context in jobs).

    Returns:
        Status dict.

    Raises:
        RuntimeError: If the scheduler is already running.
    """
    global _scheduler, _stats

    if _stats["running"]:
        raise RuntimeError("Simulator is already running")

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        func=_generate_readings,
        trigger="interval",
        seconds=interval_seconds,
        args=[app],
        id=_JOB_ID,
        replace_existing=True,
    )
    _scheduler.start()

    _stats["running"]          = True
    _stats["interval_seconds"] = interval_seconds
    logger.info("IoT simulator started — interval=%ds", interval_seconds)

    return get_status()


def stop() -> dict:
    """Stop the background scheduler.

    Returns:
        Status dict with final readings_generated count.

    Raises:
        RuntimeError: If the scheduler is not running.
    """
    global _scheduler, _stats

    if not _stats["running"]:
        raise RuntimeError("Simulator is not running")

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None

    _stats["running"] = False
    logger.info("IoT simulator stopped — %d readings generated", _stats["readings_generated"])

    return get_status()


def get_status() -> dict:
    """Return a snapshot of the current simulator state."""
    return dict(_stats)
