"""Prediction routes — POST /predict and GET /predictions endpoints.

Blueprint prefix is /api/v1 (not /api/v1/predictions) so that:
  POST /api/v1/predict         — single-sample inference
  GET  /api/v1/predictions     — history
  GET  /api/v1/predictions/device/<id>
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db
from models.device import Device
from models.prediction import Prediction
from models.sensor_reading import SensorReading
from routes import role_required
from services import alert_service, prediction_service

predictions_bp = Blueprint("predictions", __name__)

_FEATURE_NAMES = [
    "temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture",
]


@predictions_bp.post("/predict")
@role_required("admin", "operator")
def predict_endpoint():
    """Run an AI inference on sensor readings and persist the result.
    ---
    tags: [Predictions]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [device_id]
          properties:
            device_id:    {type: integer}
            temperature:  {type: number}
            humidity:     {type: number}
            ph:           {type: number}
            light_lux:    {type: number}
            co2_ppm:      {type: number}
            soil_moisture:{type: number}
            model_name:   {type: string}
    responses:
      200:
        description: Prediction result
      400:
        description: Missing features
      404:
        description: Device not found
      503:
        description: AI model unavailable
    """
    data = request.get_json(silent=True) or {}

    if not data.get("device_id"):
        return jsonify({"error": "device_id is required"}), 400

    device = Device.query.get(data["device_id"])
    if device is None:
        return jsonify({"error": "Device not found"}), 404

    model_name = data.get("model_name", "random_forest")

    # ── Run inference ─────────────────────────────────────────────────────────
    try:
        result = prediction_service.run_prediction(data, model_name=model_name)
    except RuntimeError as exc:
        return jsonify({"error": "AI model unavailable", "detail": str(exc)}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    # ── Determine reference reading_id ────────────────────────────────────────
    last_reading = (
        SensorReading.query
        .filter_by(device_id=device.device_id)
        .order_by(SensorReading.recorded_at.desc())
        .first()
    )

    if last_reading is None:
        # Create a synthetic reading so the FK constraint is satisfied
        features = prediction_service._normalize_features(data)
        synth = SensorReading(
            device_id=device.device_id,
            is_simulated=True,
            **{k: v for k, v in features.items() if k in _FEATURE_NAMES},
        )
        db.session.add(synth)
        db.session.flush()
        reading_id = synth.reading_id
    else:
        reading_id = last_reading.reading_id

    # ── Persist prediction ────────────────────────────────────────────────────
    pred = Prediction(
        device_id=device.device_id,
        reading_id=reading_id,
        model_name=result["model_name"],
        model_version=result["model_version"],
        predicted_class=result["predicted_class"],
        confidence=result["confidence"],
        raw_probabilities=result["raw_probabilities"],
        input_features=result["input_features"],
    )
    db.session.add(pred)
    db.session.flush()

    # ── Optional prediction alert ─────────────────────────────────────────────
    alert_created = False
    if result["predicted_class"] in {"warning", "critical"}:
        alert = alert_service.create_prediction_alert(
            device.device_id,
            result["predicted_class"],
            result["confidence"],
        )
        alert_created = alert is not None

    db.session.commit()

    return jsonify({
        "predicted_class":   result["predicted_class"],
        "confidence":        result["confidence"],
        "raw_probabilities": result["raw_probabilities"],
        "model_name":        result["model_name"],
        "model_version":     result["model_version"],
        "input_features":    result["input_features"],
        "prediction_id":     pred.prediction_id,
        "alert_created":     alert_created,
    }), 200


@predictions_bp.get("/predictions")
@role_required("admin")
def list_predictions():
    """Return AI prediction history with optional filters.
    ---
    tags: [Predictions]
    security: [{BearerAuth: []}]
    """
    page       = request.args.get("page",     1,  type=int)
    per_page   = request.args.get("per_page", 20, type=int)
    device_id  = request.args.get("device_id",        type=int)
    pred_class = request.args.get("predicted_class")
    model_name = request.args.get("model_name")
    from_date  = request.args.get("from_date")
    to_date    = request.args.get("to_date")

    q = Prediction.query.order_by(Prediction.created_at.desc())
    if device_id:
        q = q.filter_by(device_id=device_id)
    if pred_class:
        q = q.filter_by(predicted_class=pred_class)
    if model_name:
        q = q.filter_by(model_name=model_name)
    if from_date:
        q = q.filter(Prediction.created_at >= from_date)
    if to_date:
        q = q.filter(Prediction.created_at <= to_date)

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "predictions": [p.to_dict() for p in paginated.items],
        "total":       paginated.total,
    }), 200


@predictions_bp.get("/predictions/device/<int:device_id>")
@role_required("admin", "operator")
def predictions_by_device(device_id: int):
    """Return recent predictions for one device.
    ---
    tags: [Predictions]
    security: [{BearerAuth: []}]
    """
    if Device.query.get(device_id) is None:
        return jsonify({"error": "Device not found"}), 404

    limit = request.args.get("limit", 50, type=int)
    preds = (
        Prediction.query
        .filter_by(device_id=device_id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify([p.to_dict() for p in preds]), 200
