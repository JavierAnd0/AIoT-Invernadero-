"""Alert routes — view and manage automated threshold alerts (tenant-scoped)."""

from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import case

from models import db
from models.alert import Alert
from routes import tenant_required

alerts_bp = Blueprint("alerts", __name__)

# Severity rank used for ORDER BY on open alerts
_SEVERITY_RANK = case(
    (Alert.severity == "critical", 0),
    (Alert.severity == "high",     1),
    (Alert.severity == "medium",   2),
    (Alert.severity == "low",      3),
    else_=4,
)


@alerts_bp.get("/")
@tenant_required()
def list_alerts():
    """List alerts for the current tenant with optional filters and pagination.
    ---
    tags: [Alerts]
    security: [{BearerAuth: []}]
    """
    page       = request.args.get("page",     1,  type=int)
    per_page   = request.args.get("per_page", 20, type=int)
    status     = request.args.get("status")
    severity   = request.args.get("severity")
    device_id  = request.args.get("device_id",  type=int)
    zone_id    = request.args.get("zone_id",    type=int)
    alert_type = request.args.get("alert_type")

    q = Alert.query.filter_by(tenant_id=g.tenant_id).order_by(Alert.created_at.desc())

    if status:
        q = q.filter_by(status=status)
    if severity:
        q = q.filter_by(severity=severity)
    if device_id:
        q = q.filter_by(device_id=device_id)
    if alert_type:
        q = q.filter_by(alert_type=alert_type)
    if zone_id:
        from models.device import Device
        device_ids = [
            d.device_id
            for d in Device.query.filter_by(zone_id=zone_id, tenant_id=g.tenant_id).all()
        ]
        q = q.filter(Alert.device_id.in_(device_ids))

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "alerts":   [a.to_dict() for a in paginated.items],
        "total":    paginated.total,
        "page":     page,
    }), 200


@alerts_bp.get("/open")
@tenant_required()
def open_alerts():
    """Return all open alerts for the current tenant sorted by severity then creation time.
    ---
    tags: [Alerts]
    security: [{BearerAuth: []}]
    """
    alerts = (
        Alert.query
        .filter_by(tenant_id=g.tenant_id, status="open")
        .order_by(_SEVERITY_RANK, Alert.created_at.desc())
        .all()
    )
    return jsonify([a.to_dict() for a in alerts]), 200


@alerts_bp.put("/<int:alert_id>/acknowledge")
@tenant_required("admin", "operator")
def acknowledge_alert(alert_id: int):
    """Acknowledge an open alert and assign it to the current user.
    ---
    tags: [Alerts]
    security: [{BearerAuth: []}]
    """
    alert = Alert.query.filter_by(alert_id=alert_id, tenant_id=g.tenant_id).first()
    if alert is None:
        return jsonify({"error": "Alert not found"}), 404
    if alert.status != "open":
        return jsonify({"error": f"Alert is already {alert.status}"}), 409

    alert.status      = "acknowledged"
    alert.assigned_to = g.user_id
    db.session.commit()
    return jsonify(alert.to_dict()), 200


@alerts_bp.put("/<int:alert_id>/resolve")
@tenant_required("admin", "operator")
def resolve_alert(alert_id: int):
    """Resolve an open or acknowledged alert.
    ---
    tags: [Alerts]
    security: [{BearerAuth: []}]
    """
    alert = Alert.query.filter_by(alert_id=alert_id, tenant_id=g.tenant_id).first()
    if alert is None:
        return jsonify({"error": "Alert not found"}), 404
    if alert.status not in {"open", "acknowledged"}:
        return jsonify({"error": f"Cannot resolve an alert with status '{alert.status}'"}), 409

    alert.status      = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.session.commit()
    return jsonify(alert.to_dict()), 200
