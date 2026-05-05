"""Sensor reading routes — ingest and query time-series IoT data (tenant-scoped)."""

from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from models import db
from models.device import Device
from models.prediction import Prediction
from models.sensor_reading import SensorReading
from routes import tenant_required
from services import alert_service, prediction_service

readings_bp = Blueprint("readings", __name__)

_SENSOR_FIELDS = ["temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture"]


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
    from_date    = request.args.get("from_date")
    to_date      = request.args.get("to_date")
    is_simulated = request.args.get("is_simulated")

    q = SensorReading.query.filter_by(tenant_id=g.tenant_id).order_by(SensorReading.recorded_at.desc())

    if device_id:
        q = q.filter_by(device_id=device_id)
    if is_simulated is not None:
        q = q.filter_by(is_simulated=is_simulated.lower() == "true")
    if from_date:
        q = q.filter(SensorReading.recorded_at >= from_date)
    if to_date:
        q = q.filter(SensorReading.recorded_at <= to_date)

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

    device = Device.query.filter_by(device_id=data["device_id"], tenant_id=g.tenant_id).first()
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

    alerts_created_count = 0
    try:
        alerts = alert_service.check_and_create_alerts(reading, g.tenant_id)
        alerts_created_count = len(alerts)
    except Exception:
        pass

    pred_dict = None
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
    except Exception:
        pass

    db.session.commit()
    return jsonify({
        "reading":        reading.to_dict(),
        "alerts_created": alerts_created_count,
        "prediction":     pred_dict,
    }), 201


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
    device = Device.query.filter_by(device_id=device_id, tenant_id=g.tenant_id).first()
    if device is None:
        return jsonify({"error": "Device not found"}), 404

    limit     = request.args.get("limit",     100, type=int)
    from_date = request.args.get("from_date")
    to_date   = request.args.get("to_date")

    q = (
        SensorReading.query
        .filter_by(device_id=device_id, tenant_id=g.tenant_id)
        .order_by(SensorReading.recorded_at.desc())
    )
    if from_date:
        q = q.filter(SensorReading.recorded_at >= from_date)
    if to_date:
        q = q.filter(SensorReading.recorded_at <= to_date)

    return jsonify([r.to_dict() for r in q.limit(limit).all()]), 200
