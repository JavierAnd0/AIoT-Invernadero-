"""Crop routes — active batch management."""

from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.crop import Crop
from models.crop_type import CropType
from models.zone import Zone
from routes import role_required

crops_bp = Blueprint("crops", __name__)


@crops_bp.get("/")
@jwt_required()
def list_crops():
    """List crops with optional filters.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    q = Crop.query
    if zone_id := request.args.get("zone_id", type=int):
        q = q.filter_by(zone_id=zone_id)
    if status := request.args.get("status"):
        q = q.filter_by(status=status)
    if crop_type_id := request.args.get("crop_type_id", type=int):
        q = q.filter_by(crop_type_id=crop_type_id)
    return jsonify([c.to_dict() for c in q.all()]), 200


@crops_bp.post("/")
@role_required("admin", "operator")
def create_crop():
    """Register a new crop batch.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    required = ["zone_id", "crop_type_id", "quantity", "planted_at"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    zone = Zone.query.get(data["zone_id"])
    if zone is None or not zone.is_active:
        return jsonify({"error": "Zone not found or not active"}), 404

    if CropType.query.get(data["crop_type_id"]) is None:
        return jsonify({"error": "Crop type not found"}), 404

    try:
        quantity = int(data["quantity"])
    except (TypeError, ValueError):
        return jsonify({"error": "quantity must be an integer"}), 400
    if quantity <= 0:
        return jsonify({"error": "quantity must be > 0"}), 400

    planted_at = _parse_date(data["planted_at"])
    if planted_at is None:
        return jsonify({"error": "planted_at must be a valid date (YYYY-MM-DD)"}), 400

    expected_harvest_at = None
    if data.get("expected_harvest_at"):
        expected_harvest_at = _parse_date(data["expected_harvest_at"])
        if expected_harvest_at is None:
            return jsonify({"error": "expected_harvest_at must be a valid date"}), 400
        if expected_harvest_at <= planted_at:
            return jsonify({"error": "expected_harvest_at must be after planted_at"}), 400

    if data.get("batch_code") and Crop.query.filter_by(batch_code=data["batch_code"]).first():
        return jsonify({"error": "batch_code already exists"}), 409

    crop = Crop(
        zone_id=data["zone_id"],
        crop_type_id=data["crop_type_id"],
        created_by=int(get_jwt_identity()),
        batch_code=data.get("batch_code"),
        quantity=quantity,
        planted_at=planted_at,
        expected_harvest_at=expected_harvest_at,
        notes=data.get("notes"),
    )
    db.session.add(crop)
    db.session.commit()
    return jsonify(crop.to_dict(include_zone=True, include_crop_type=True)), 201


@crops_bp.get("/<int:crop_id>")
@jwt_required()
def get_crop(crop_id: int):
    """Get a crop batch by ID with embedded zone and crop type.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    crop = Crop.query.get(crop_id)
    if crop is None:
        return jsonify({"error": "Crop not found"}), 404
    return jsonify(crop.to_dict(include_zone=True, include_crop_type=True)), 200


@crops_bp.put("/<int:crop_id>")
@role_required("admin", "operator")
def update_crop(crop_id: int):
    """Update a crop's status, notes, or actual harvest date.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    crop = Crop.query.get(crop_id)
    if crop is None:
        return jsonify({"error": "Crop not found"}), 404

    data = request.get_json(silent=True) or {}

    if "status" in data:
        if data["status"] not in Crop.VALID_STATUSES:
            return jsonify({"error": f"Invalid status. Choose from {sorted(Crop.VALID_STATUSES)}"}), 400
        crop.status = data["status"]
        if crop.status == "harvested" and not data.get("actual_harvest_at"):
            crop.actual_harvest_at = date.today()

    if "actual_harvest_at" in data and data["actual_harvest_at"]:
        parsed = _parse_date(data["actual_harvest_at"])
        if parsed is None:
            return jsonify({"error": "actual_harvest_at must be a valid date"}), 400
        crop.actual_harvest_at = parsed

    if "notes" in data:
        crop.notes = data["notes"]

    db.session.commit()
    return jsonify(crop.to_dict()), 200


@crops_bp.get("/zone/<int:zone_id>")
@jwt_required()
def crops_by_zone(zone_id: int):
    """List crops in a specific zone (active statuses by default).
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    if Zone.query.get(zone_id) is None:
        return jsonify({"error": "Zone not found"}), 404

    status = request.args.get("status")
    q = Crop.query.filter_by(zone_id=zone_id)
    if status:
        q = q.filter_by(status=status)
    else:
        q = q.filter(Crop.status.notin_(["harvested", "failed"]))
    return jsonify([c.to_dict() for c in q.all()]), 200


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_date(value: str) -> date | None:
    """Parse an ISO date string, returning None on failure."""
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None
