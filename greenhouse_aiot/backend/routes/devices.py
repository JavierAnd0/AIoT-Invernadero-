"""Device routes — IoT sensor node management."""

from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.device import Device
from models.zone import Zone
from routes import role_required

devices_bp = Blueprint("devices", __name__)


@devices_bp.get("/")
@jwt_required()
def list_devices():
    """List devices with optional filters.
    ---
    tags: [Devices]
    security: [{BearerAuth: []}]
    """
    q = Device.query
    if zone_id := request.args.get("zone_id", type=int):
        q = q.filter_by(zone_id=zone_id)
    if status := request.args.get("status"):
        q = q.filter_by(status=status)
    if device_type := request.args.get("device_type"):
        q = q.filter_by(device_type=device_type)
    return jsonify([d.to_dict() for d in q.all()]), 200


@devices_bp.post("/")
@role_required("admin")
def create_device():
    """Register a new IoT device.
    ---
    tags: [Devices]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    if not data.get("zone_id") or not data.get("name"):
        return jsonify({"error": "zone_id and name are required"}), 400

    zone = Zone.query.get(data["zone_id"])
    if zone is None or not zone.is_active:
        return jsonify({"error": "Zone not found or not active"}), 404

    device_type = data.get("device_type", "simulated")
    if device_type not in Device.VALID_TYPES:
        return jsonify({"error": f"Invalid device_type. Choose from {sorted(Device.VALID_TYPES)}"}), 400

    registered_by = int(get_jwt_identity())
    device = Device(
        zone_id=data["zone_id"],
        registered_by=registered_by,
        name=data["name"],
        serial_number=data.get("serial_number"),
        device_type=device_type,
        firmware_version=data.get("firmware_version"),
    )
    db.session.add(device)
    db.session.commit()
    return jsonify(device.to_dict()), 201


@devices_bp.get("/<int:device_id>")
@jwt_required()
def get_device(device_id: int):
    """Get device by ID, including the latest sensor reading.
    ---
    tags: [Devices]
    security: [{BearerAuth: []}]
    """
    device = Device.query.get(device_id)
    if device is None:
        return jsonify({"error": "Device not found"}), 404
    return jsonify(device.to_dict(include_last_reading=True)), 200


@devices_bp.put("/<int:device_id>/status")
@role_required("admin", "operator")
def update_device_status(device_id: int):
    """Update device connectivity status.
    ---
    tags: [Devices]
    security: [{BearerAuth: []}]
    """
    device = Device.query.get(device_id)
    if device is None:
        return jsonify({"error": "Device not found"}), 404

    data   = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in Device.VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Choose from {sorted(Device.VALID_STATUSES)}"}), 400

    device.status = status
    if status == "online":
        device.last_seen_at = datetime.utcnow()
    db.session.commit()
    return jsonify(device.to_dict()), 200
