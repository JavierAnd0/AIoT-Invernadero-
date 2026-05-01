"""Crop-type routes — species catalog management."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import db
from models.crop_type import CropType
from routes import role_required

crop_types_bp = Blueprint("crop_types", __name__)


@crop_types_bp.get("/")
@jwt_required()
def list_crop_types():
    """Return all crop types.
    ---
    tags: [CropTypes]
    security: [{BearerAuth: []}]
    """
    return jsonify([ct.to_dict() for ct in CropType.query.all()]), 200


@crop_types_bp.post("/")
@role_required("admin")
def create_crop_type():
    """Add a new crop species to the catalog.
    ---
    tags: [CropTypes]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    required_numeric = [
        "temp_min", "temp_max", "temp_optimal",
        "humidity_min", "humidity_max",
        "ph_min", "ph_max",
    ]
    missing = [f for f in ["name"] + required_numeric if f not in data or data[f] is None]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    try:
        temp_min     = float(data["temp_min"])
        temp_max     = float(data["temp_max"])
        temp_optimal = float(data["temp_optimal"])
        hum_min      = float(data["humidity_min"])
        hum_max      = float(data["humidity_max"])
        ph_min       = float(data["ph_min"])
        ph_max       = float(data["ph_max"])
    except (TypeError, ValueError):
        return jsonify({"error": "Threshold fields must be numeric"}), 400

    # Validate CHECK constraints from schema.sql
    errors = []
    if temp_min >= temp_max:
        errors.append("temp_min must be < temp_max")
    if not (temp_min <= temp_optimal <= temp_max):
        errors.append("temp_optimal must be between temp_min and temp_max")
    if hum_min >= hum_max:
        errors.append("humidity_min must be < humidity_max")
    if ph_min >= ph_max:
        errors.append("ph_min must be < ph_max")
    if "growth_days" in data and data["growth_days"] is not None:
        if int(data["growth_days"]) <= 0:
            errors.append("growth_days must be > 0")
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    if CropType.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "Crop type name already exists"}), 409

    ct = CropType(
        name=data["name"],
        scientific_name=data.get("scientific_name"),
        description=data.get("description"),
        temp_min=temp_min,
        temp_max=temp_max,
        temp_optimal=temp_optimal,
        humidity_min=hum_min,
        humidity_max=hum_max,
        ph_min=ph_min,
        ph_max=ph_max,
        light_min_lux=data.get("light_min_lux"),
        light_max_lux=data.get("light_max_lux"),
        growth_days=data.get("growth_days"),
    )
    db.session.add(ct)
    db.session.commit()
    return jsonify(ct.to_dict()), 201


@crop_types_bp.get("/<int:crop_type_id>")
@jwt_required()
def get_crop_type(crop_type_id: int):
    """Return a single crop type.
    ---
    tags: [CropTypes]
    security: [{BearerAuth: []}]
    """
    ct = CropType.query.get(crop_type_id)
    if ct is None:
        return jsonify({"error": "Crop type not found"}), 404
    return jsonify(ct.to_dict()), 200
