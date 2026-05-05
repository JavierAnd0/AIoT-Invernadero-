"""Tenant management routes.

Two sets of endpoints:
  - Platform-level  (GET/POST /tenants/)          — superadmin only
  - Tenant-level    (/tenants/<id>/members/...)   — tenant admin
"""

import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import db
from models.tenant import Tenant
from models.tenant_membership import TenantMembership
from models.user import User
from routes import superadmin_required, tenant_required

tenants_bp = Blueprint("tenants", __name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ═══════════════════════════════════════════════════════════════════════════════
# Platform-level tenant CRUD (superadmin only)
# ═══════════════════════════════════════════════════════════════════════════════

@tenants_bp.get("/")
@superadmin_required
def list_tenants():
    """List all tenants (platform admin only).
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    """
    tenants = Tenant.query.order_by(Tenant.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tenants]), 200


@tenants_bp.post("/")
@superadmin_required
def create_tenant():
    """Create a new tenant (platform admin only).
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [name]
          properties:
            name: {type: string}
    """
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    slug = Tenant.slugify(data["name"])
    if Tenant.query.filter_by(slug=slug).first():
        return jsonify({"error": "A tenant with that name/slug already exists"}), 409

    tenant = Tenant(name=data["name"], slug=slug)
    db.session.add(tenant)
    db.session.commit()
    return jsonify(tenant.to_dict()), 201


@tenants_bp.get("/<int:tenant_id>")
@superadmin_required
def get_tenant(tenant_id: int):
    """Get tenant by ID (platform admin only).
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    """
    tenant = Tenant.query.get(tenant_id)
    if tenant is None:
        return jsonify({"error": "Tenant not found"}), 404
    return jsonify(tenant.to_dict()), 200


# ═══════════════════════════════════════════════════════════════════════════════
# Tenant membership management (tenant admin)
# ═══════════════════════════════════════════════════════════════════════════════

@tenants_bp.get("/<int:tenant_id>/members")
@tenant_required("admin")
def list_members(tenant_id: int):
    """List all members of the current tenant.
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    """
    from flask import g
    if tenant_id != g.tenant_id:
        return jsonify({"error": "Tenant mismatch"}), 403

    memberships = TenantMembership.query.filter_by(tenant_id=tenant_id).all()
    result = []
    for m in memberships:
        entry = m.to_dict()
        entry["user"] = m.user.to_dict() if m.user else None
        result.append(entry)
    return jsonify(result), 200


@tenants_bp.post("/<int:tenant_id>/members")
@tenant_required("admin")
def invite_member(tenant_id: int):
    """Invite an existing user to this tenant with a given role.

    The user must already have an account (created via /auth/bootstrap or a
    previous invite).  If no account exists yet you can pass ``create_user=true``
    to also create the local user account.
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [email, role]
          properties:
            email:       {type: string}
            role:        {type: string, enum: [admin, operator, viewer]}
            full_name:   {type: string}
            username:    {type: string}
            password:    {type: string}
            create_user: {type: boolean, description: "Create the user if they don't exist yet"}
    """
    from flask import g
    if tenant_id != g.tenant_id:
        return jsonify({"error": "Tenant mismatch"}), 403

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    role  = data.get("role", "viewer")

    if not email:
        return jsonify({"error": "email is required"}), 400
    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format"}), 400
    if role not in TenantMembership.VALID_ROLES:
        return jsonify({"error": f"Invalid role. Choose from {sorted(TenantMembership.VALID_ROLES)}"}), 400

    user = User.query.filter_by(email=email).first()

    if user is None:
        if not data.get("create_user"):
            return jsonify({
                "error": "User not found. Pass create_user=true to also create the account."
            }), 404

        required_new = ["username", "full_name", "password"]
        missing = [f for f in required_new if not data.get(f)]
        if missing:
            return jsonify({"error": f"To create user, provide: {missing}"}), 400

        if len(data["password"]) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"error": "Username already taken"}), 409

        user = User(
            username=data["username"],
            email=email,
            full_name=data["full_name"],
            auth_provider="local",
            is_active=True,
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

    # Check if already a member
    existing = TenantMembership.query.filter_by(
        tenant_id=tenant_id, user_id=user.user_id
    ).first()

    if existing:
        if existing.is_active:
            return jsonify({"error": "User is already a member of this tenant"}), 409
        # Re-activate
        existing.is_active = True
        existing.role      = role
        db.session.commit()
        entry = existing.to_dict()
        entry["user"] = user.to_dict()
        return jsonify(entry), 200

    membership = TenantMembership(
        tenant_id=tenant_id,
        user_id=user.user_id,
        role=role,
        is_active=True,
    )
    db.session.add(membership)
    db.session.commit()

    entry = membership.to_dict()
    entry["user"] = user.to_dict()
    return jsonify(entry), 201


@tenants_bp.put("/<int:tenant_id>/members/<int:user_id>")
@tenant_required("admin")
def update_member(tenant_id: int, user_id: int):
    """Update a member's role in this tenant.
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    """
    from flask import g
    if tenant_id != g.tenant_id:
        return jsonify({"error": "Tenant mismatch"}), 403

    # Prevent admin from changing their own role
    if user_id == g.user_id:
        return jsonify({"error": "Cannot change your own role"}), 400

    membership = TenantMembership.query.filter_by(
        tenant_id=tenant_id, user_id=user_id
    ).first()
    if membership is None:
        return jsonify({"error": "Membership not found"}), 404

    data = request.get_json(silent=True) or {}
    if "role" in data:
        if data["role"] not in TenantMembership.VALID_ROLES:
            return jsonify({"error": f"Invalid role. Choose from {sorted(TenantMembership.VALID_ROLES)}"}), 400
        membership.role = data["role"]
    if "is_active" in data:
        membership.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify(membership.to_dict()), 200


@tenants_bp.delete("/<int:tenant_id>/members/<int:user_id>")
@tenant_required("admin")
def remove_member(tenant_id: int, user_id: int):
    """Remove (deactivate) a member from this tenant.
    ---
    tags: [Tenants]
    security: [{BearerAuth: []}]
    """
    from flask import g
    if tenant_id != g.tenant_id:
        return jsonify({"error": "Tenant mismatch"}), 403

    if user_id == g.user_id:
        return jsonify({"error": "Cannot remove yourself from the tenant"}), 400

    membership = TenantMembership.query.filter_by(
        tenant_id=tenant_id, user_id=user_id, is_active=True
    ).first()
    if membership is None:
        return jsonify({"error": "Active membership not found"}), 404

    membership.is_active = False
    db.session.commit()
    return jsonify({"message": "Member removed from tenant"}), 200
