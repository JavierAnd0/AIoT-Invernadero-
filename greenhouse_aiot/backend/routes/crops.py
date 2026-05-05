"""Crop routes — active batch management (tenant-scoped)."""

from datetime import date, datetime

from flask import Blueprint, g, jsonify, request

from models import db
from models.crop import Crop
from models.crop_type import CropType
from models.zone import Zone
from routes import tenant_required

crops_bp = Blueprint("crops", __name__)


@crops_bp.get("/")
@tenant_required()
def list_crops():
    """List crops for the current tenant with optional filters.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    q = Crop.query.filter_by(tenant_id=g.tenant_id)
    if zone_id := request.args.get("zone_id", type=int):
        q = q.filter_by(zone_id=zone_id)
    if status := request.args.get("status"):
        q = q.filter_by(status=status)
    if crop_type_id := request.args.get("crop_type_id", type=int):
        q = q.filter_by(crop_type_id=crop_type_id)
    return jsonify([c.to_dict() for c in q.all()]), 200


@crops_bp.post("/")
@tenant_required("admin", "operator")
def create_crop():
    """Register a new crop batch for the current tenant.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    required = ["zone_id", "crop_type_id", "quantity", "planted_at"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    # Zone must belong to this tenant
    zone = Zone.query.filter_by(zone_id=data["zone_id"], tenant_id=g.tenant_id).first()
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

    # batch_code uniqueness is now per-tenant
    if data.get("batch_code") and Crop.query.filter_by(
        tenant_id=g.tenant_id, batch_code=data["batch_code"]
    ).first():
        return jsonify({"error": "batch_code already exists in this tenant"}), 409

    crop = Crop(
        tenant_id=g.tenant_id,
        zone_id=data["zone_id"],
        crop_type_id=data["crop_type_id"],
        created_by=g.user_id,
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
@tenant_required()
def get_crop(crop_id: int):
    """Get a crop batch by ID with embedded zone and crop type.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    crop = Crop.query.filter_by(crop_id=crop_id, tenant_id=g.tenant_id).first()
    if crop is None:
        return jsonify({"error": "Crop not found"}), 404
    return jsonify(crop.to_dict(include_zone=True, include_crop_type=True)), 200


@crops_bp.put("/<int:crop_id>")
@tenant_required("admin", "operator")
def update_crop(crop_id: int):
    """Update a crop's status, notes, or actual harvest date.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    crop = Crop.query.filter_by(crop_id=crop_id, tenant_id=g.tenant_id).first()
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
@tenant_required()
def crops_by_zone(zone_id: int):
    """List crops in a specific zone for the current tenant.
    ---
    tags: [Crops]
    security: [{BearerAuth: []}]
    """
    # Verify zone belongs to this tenant
    if Zone.query.filter_by(zone_id=zone_id, tenant_id=g.tenant_id).first() is None:
        return jsonify({"error": "Zone not found"}), 404

    status = request.args.get("status")
    q = Crop.query.filter_by(zone_id=zone_id, tenant_id=g.tenant_id)
    if status:
        q = q.filter_by(status=status)
    else:
        q = q.filter(Crop.status.notin_(["harvested", "failed"]))
    return jsonify([c.to_dict() for c in q.all()]), 200


# ── helpers ────────────────────────────────────────────────────────────────────

def _parse_date(value: str) -> date | None:
    """Parse an ISO date string, returning None on failure."""
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None
