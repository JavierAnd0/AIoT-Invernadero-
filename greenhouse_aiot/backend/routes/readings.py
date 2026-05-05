"""Sensor reading routes — ingest and query time-series IoT data (tenant-scoped)."""

import logging
from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from models import db
from models.device import Device
from models.prediction import Prediction
from models.sensor_reading import SensorReading
from routes import tenant_required
from services import alert_service, prediction_service

logger = logging.getLogger(__name__)
readings_bp = Blueprint("readings", __name__)

_SENSOR_FIELDS = ["temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture"]

# Accepted ISO-8601 date formats
_DATE_FORMATS = (
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M",
    "%Y-%m-%d",
)


def _parse_date_param(name: str, value: str | None) -> datetime | None:
    """Parse an ISO-8601 date/datetime string from a query parameter.

    Returns None if *value* is falsy.
    Aborts with a 400 JSON response on invalid format.
    """
    if not value:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    from flask import abort
    abort(400, description=(
        f"Invalid '{name}' format: '{value}'. "
        "Use ISO-8601 — e.g. 2024-06-15 or 2024-06-15T08:30:00"
    ))


@readings_bp.get("/")
@tenant_required()
def list_readings():
    """List readings for the current tenant with optional filters and pagination.
    ---
    tags: [Readings]
    security: [{BearerAuth: []}]
    """
    page         = request.args.get("page",     1,  type=int)
    per_page     = request.args.get("per_page", 50, type=int)
    device_id    = request.args.get("device_id",    type=int)
    is_simulated = request.args.get("is_simulated")

    try:
        from_dt = _parse_date_param("from_date", request.args.get("from_date"))
        to_dt   = _parse_date_param("to_date",   request.args.get("to_date"))
    except Exception:
        return jsonify({"error": "Invalid date parameter"}), 400

    q = SensorReading.query.filter_by(tenant_id=g.tenant_id).order_by(
        SensorReading.recorded_at.desc()
    )
    if device_id:
        q = q.filter_by(device_id=device_id)
    if is_simulated is not None:
        q = q.filter_by(is_simulated=is_simulated.lower() == "true")
    if from_dt:
        q = q.filter(SensorReading.recorded_at >= from_dt)
    if to_dt:
        q = q.filter(SensorReading.recorded_at <= to_dt)

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "readings": [r.to_dict() for r in paginated.items],
        "total":    paginated.total,
        "page":     page,
    }), 200


@readings_bp.post("/")
@tenant_required("admin", "operator")
def create_reading():
    """Ingest a sensor reading, trigger alerts and AI prediction.
    ---
    tags: [Readings]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    if not data.get("device_id"):
        return jsonify({"error": "device_id is required"}), 400

    device = Device.query.filter_by(
        device_id=data["device_id"], tenant_id=g.tenant_id
    ).first()
    if device is None:
        return jsonify({"error": "Device not found"}), 404

    errors = SensorReading.validate_fields(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    reading = SensorReading(
        tenant_id=g.tenant_id,
        device_id=data["device_id"],
        is_simulated=bool(data.get("is_simulated", False)),
        recorded_at=datetime.utcnow(),
        **{f: data[f] for f in _SENSOR_FIELDS if f in data and data[f] is not None},
    )
    db.session.add(reading)
    db.session.flush()

    device.last_seen_at = datetime.utcnow()

    # ── Alert evaluation ───────────────────────────────────────────────────────
    alerts_created_count = 0
    alerts_error: str | None = None
    try:
        alerts = alert_service.check_and_create_alerts(reading, g.tenant_id)
        alerts_created_count = len(alerts)
    except Exception as exc:
        logger.exception(
            "Alert check failed for device %d (reading %d)",
            reading.device_id, reading.reading_id,
        )
        alerts_error = str(exc)

    # ── AI prediction ──────────────────────────────────────────────────────────
    pred_dict: dict | None = None
    prediction_error: str | None = None
    try:
        features = {
            f: float(getattr(reading, f))
            for f in _SENSOR_FIELDS
            if getattr(reading, f) is not None
        }
        result = prediction_service.run_prediction(features)

        pred_obj = Prediction(
            tenant_id=g.tenant_id,
            device_id=reading.device_id,
            reading_id=reading.reading_id,
            model_name=result["model_name"],
            model_version=result["model_version"],
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            raw_probabilities=result["raw_probabilities"],
            input_features=features,
        )
        db.session.add(pred_obj)

        if result["predicted_class"] in {"warning", "critical"}:
            alert_service.create_prediction_alert(
                reading.device_id,
                result["predicted_class"],
                result["confidence"],
                g.tenant_id,
            )
            alerts_created_count += 1

        db.session.flush()
        pred_dict = pred_obj.to_dict()
    except Exception as exc:
        logger.exception(
            "Prediction failed for device %d (reading %d)",
            reading.device_id, reading.reading_id,
        )
        prediction_error = str(exc)

    db.session.commit()

    response: dict = {
        "reading":        reading.to_dict(),
        "alerts_created": alerts_created_count,
        "prediction":     pred_dict,
    }
    # Surface non-fatal subsystem errors so the caller knows what happened.
    # The reading itself was persisted successfully (HTTP 201 still applies).
    if alerts_error:
        response["alerts_error"] = alerts_error
    if prediction_error:
        response["prediction_error"] = prediction_error

    return jsonify(response), 201


@readings_bp.get("/latest")
@tenant_required()
def latest_readings():
    """Return the most recent reading for every active device in this tenant.
    ---
    tags: [Readings]
    security: [{BearerAuth: []}]
    """
    subq = (
        db.session.query(
            SensorReading.device_id,
            func.max(SensorReading.recorded_at).label("max_time"),
        )
        .filter(SensorReading.tenant_id == g.tenant_id)
        .group_by(SensorReading.device_id)
        .subquery()
    )

    latest = (
        db.session.query(SensorReading)
        .join(
            subq,
            (SensorReading.device_id   == subq.c.device_id) &
            (SensorReading.recorded_at == subq.c.max_time),
        )
        .all()
    )

    latest_map = {r.device_id: r for r in latest}
    devices    = Device.query.filter_by(tenant_id=g.tenant_id, status="online").all()

    return jsonify([
        {
            "device":  d.to_dict(),
            "reading": latest_map[d.device_id].to_dict() if d.device_id in latest_map else None,
        }
        for d in devices
    ]), 200


@readings_bp.get("/device/<int:device_id>")
@tenant_required()
def readings_by_device(device_id: int):
    """Return readings for a specific device in this tenant, newest first.
    ---
    tags: [Readings]
    security: [{BearerAuth: []}]
    """
    device = Device.query.filter_by(
        device_id=device_id, tenant_id=g.tenant_id
    ).first()
    if device is None:
        return jsonify({"error": "Device not found"}), 404

    limit = request.args.get("limit", 100, type=int)

    try:
        from_dt = _parse_date_param("from_date", request.args.get("from_date"))
        to_dt   = _parse_date_param("to_date",   request.args.get("to_date"))
    except Exception:
        return jsonify({"error": "Invalid date parameter"}), 400

    q = (
        SensorReading.query
        .filter_by(device_id=device_id, tenant_id=g.tenant_id)
        .order_by(SensorReading.recorded_at.desc())
    )
    if from_dt:
        q = q.filter(SensorReading.recorded_at >= from_dt)
    if to_dt:
        q = q.filter(SensorReading.recorded_at <= to_dt)

    return jsonify([r.to_dict() for r in q.limit(limit).all()]), 200
