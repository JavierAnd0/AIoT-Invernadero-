"""IoT simulator routes — start, stop, and query the background scheduler."""

from flask import Blueprint, current_app, jsonify, request

from routes import tenant_required
from services import simulator_service

simulator_bp = Blueprint("simulator", __name__)

_MIN_INTERVAL = 5
_MAX_INTERVAL = 120


@simulator_bp.post("/start")
@tenant_required("admin")
def start_simulator():
    """Start the IoT simulator scheduler.
    ---
    tags: [Simulator]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        schema:
          type: object
          properties:
            interval_seconds: {type: integer, minimum: 5, maximum: 120}
    responses:
      200:
        description: Simulator started
      409:
        description: Already running
    """
    data     = request.get_json(silent=True) or {}
    interval = data.get("interval_seconds", current_app.config["SIMULATOR_INTERVAL"])

    try:
        interval = int(interval)
    except (TypeError, ValueError):
        return jsonify({"error": "interval_seconds must be an integer"}), 400

    if not (_MIN_INTERVAL <= interval <= _MAX_INTERVAL):
        return jsonify({
            "error": f"interval_seconds must be between {_MIN_INTERVAL} and {_MAX_INTERVAL}"
        }), 400

    try:
        status = simulator_service.start(
            interval_seconds=interval,
            app=current_app._get_current_object(),
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409

    return jsonify({
        "status":           "running",
        "interval_seconds": interval,
        "message":          "Simulator started",
        **status,
    }), 200


@simulator_bp.post("/stop")
@tenant_required("admin")
def stop_simulator():
    """Stop the IoT simulator scheduler.
    ---
    tags: [Simulator]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Simulator stopped
      409:
        description: Not running
    """
    try:
        status = simulator_service.stop()
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409

    return jsonify({"status": "stopped", **status}), 200


@simulator_bp.get("/status")
@tenant_required("admin")
def simulator_status():
    """Return current simulator state.
    ---
    tags: [Simulator]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Simulator status
    """
    return jsonify(simulator_service.get_status()), 200
