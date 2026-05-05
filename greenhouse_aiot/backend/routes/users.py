"""User management routes — scoped to the current tenant.

Tenant admins manage memberships (roles, active flag) within their tenant.
The underlying User record (username, email, full_name) is global and can
only be modified by the user themselves or via /tenants/<id>/members.
"""

from datetime import datetime

from flask import Blueprint, g, jsonify, request

from models import db
from models.tenant_membership import TenantMembership
from models.user import User
from routes import tenant_required

users_bp = Blueprint("users", __name__)


@users_bp.get("/")
@tenant_required("admin")
def list_users():
    """List all members of the current tenant with optional filters.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    page      = request.args.get("page",     1,    type=int)
    per_page  = request.args.get("per_page", 20,   type=int)
    role      = request.args.get("role")
    is_active = request.args.get("is_active")

    q = TenantMembership.query.filter_by(tenant_id=g.tenant_id)
    if role:
        q = q.filter_by(role=role)
    if is_active is not None:
        q = q.filter_by(is_active=is_active.lower() == "true")

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for m in paginated.items:
        entry = m.user.to_dict() if m.user else {}
        entry["role"]          = m.role
        entry["membership_id"] = m.membership_id
        entry["member_active"] = m.is_active
        result.append(entry)

    return jsonify({
        "users":    result,
        "total":    paginated.total,
        "page":     page,
        "per_page": per_page,
    }), 200


@users_bp.get("/<int:user_id>")
@tenant_required("admin")
def get_user(user_id: int):
    """Get a tenant member by user_id.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    membership = TenantMembership.query.filter_by(
        tenant_id=g.tenant_id, user_id=user_id
    ).first()
    if membership is None:
        return jsonify({"error": "User not found in this tenant"}), 404

    entry = membership.user.to_dict()
    entry["role"]          = membership.role
    entry["membership_id"] = membership.membership_id
    entry["member_active"] = membership.is_active
    return jsonify(entry), 200


@users_bp.put("/<int:user_id>")
@tenant_required("admin")
def update_user(user_id: int):
    """Update a tenant member's role or active status.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    if user_id == g.user_id:
        return jsonify({"error": "Cannot change your own role or status"}), 400

    membership = TenantMembership.query.filter_by(
        tenant_id=g.tenant_id, user_id=user_id
    ).first()
    if membership is None:
        return jsonify({"error": "User not found in this tenant"}), 404

    data = request.get_json(silent=True) or {}
    if "role" in data:
        if data["role"] not in TenantMembership.VALID_ROLES:
            return jsonify({"error": f"Invalid role. Choose from {sorted(TenantMembership.VALID_ROLES)}"}), 400
        membership.role = data["role"]

    if "is_active" in data:
        membership.is_active = bool(data["is_active"])

    db.session.commit()

    entry = membership.user.to_dict()
    entry["role"]          = membership.role
    entry["membership_id"] = membership.membership_id
    entry["member_active"] = membership.is_active
    return jsonify(entry), 200


@users_bp.delete("/<int:user_id>")
@tenant_required("admin")
def deactivate_user(user_id: int):
    """Deactivate a member within this tenant (does not delete the global user).
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    if user_id == g.user_id:
        return jsonify({"error": "Cannot deactivate your own membership"}), 400

    membership = TenantMembership.query.filter_by(
        tenant_id=g.tenant_id, user_id=user_id, is_active=True
    ).first()
    if membership is None:
        return jsonify({"error": "Active membership not found"}), 404

    membership.is_active = False
    db.session.commit()
    return jsonify({"message": "User deactivated in this tenant"}), 200
