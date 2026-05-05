"""Zone routes — greenhouse section management (tenant-scoped)."""

from flask import Blueprint, g, jsonify, request

from models import db
from models.zone import Zone
from routes import tenant_required

zones_bp = Blueprint("zones", __name__)


@zones_bp.get("/")
@tenant_required()
def list_zones():
    """List zones for the current tenant, optionally filtering by is_active.
    ---
    tags: [Zones]
    security: [{BearerAuth: []}]
    """
    is_active_param = request.args.get("is_active", "true")
    is_active       = is_active_param.lower() != "false"
    zones = Zone.query.filter_by(tenant_id=g.tenant_id, is_active=is_active).all()
    return jsonify([z.to_dict() for z in zones]), 200


@zones_bp.post("/")
@tenant_required("admin", "operator")
def create_zone():
    """Create a new greenhouse zone for the current tenant.
    ---
    tags: [Zones]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    if "area_m2" in data and data["area_m2"] is not None:
        try:
            area = float(data["area_m2"])
        except (TypeError, ValueError):
            return jsonify({"error": "area_m2 must be numeric"}), 400
        if area <= 0:
            return jsonify({"error": "area_m2 must be > 0"}), 400
    else:
        area = None

    # Uniqueness is now per-tenant
    if Zone.query.filter_by(tenant_id=g.tenant_id, name=data["name"]).first():
        return jsonify({"error": "Zone name already exists in this tenant"}), 409

    zone = Zone(
        tenant_id=g.tenant_id,
        name=data["name"],
        description=data.get("description"),
        area_m2=area,
    )
    db.session.add(zone)
    db.session.commit()
    return jsonify(zone.to_dict()), 201


@zones_bp.get("/<int:zone_id>")
@tenant_required()
def get_zone(zone_id: int):
    """Get a zone by ID including embedded devices and active crops.
    ---
    tags: [Zones]
    security: [{BearerAuth: []}]
    """
    zone = Zone.query.filter_by(zone_id=zone_id, tenant_id=g.tenant_id).first()
    if zone is None:
        return jsonify({"error": "Zone not found"}), 404
    return jsonify(zone.to_dict(include_devices=True, include_crops=True)), 200


@zones_bp.put("/<int:zone_id>")
@tenant_required("admin")
def update_zone(zone_id: int):
    """Update zone fields.
    ---
    tags: [Zones]
    security: [{BearerAuth: []}]
    """
    zone = Zone.query.filter_by(zone_id=zone_id, tenant_id=g.tenant_id).first()
    if zone is None:
        return jsonify({"error": "Zone not found"}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        existing = Zone.query.filter_by(tenant_id=g.tenant_id, name=data["name"]).first()
        if existing and existing.zone_id != zone_id:
            return jsonify({"error": "Zone name already exists in this tenant"}), 409
        zone.name = data["name"]
    if "description" in data:
        zone.description = data["description"]
    if "area_m2" in data and data["area_m2"] is not None:
        try:
            area = float(data["area_m2"])
        except (TypeError, ValueError):
            return jsonify({"error": "area_m2 must be numeric"}), 400
        if area <= 0:
            return jsonify({"error": "area_m2 must be > 0"}), 400
        zone.area_m2 = area
    if "is_active" in data:
        zone.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify(zone.to_dict()), 200
