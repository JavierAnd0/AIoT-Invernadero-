"""User management routes — CRUD restricted to admin role."""

import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from models import db
from models.user import User
from routes import role_required

users_bp = Blueprint("users", __name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@users_bp.get("/")
@role_required("admin")
def list_users():
    """List all users with optional filters.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    page     = request.args.get("page",     1,    type=int)
    per_page = request.args.get("per_page", 20,   type=int)
    role     = request.args.get("role")
    is_active = request.args.get("is_active")

    q = User.query
    if role:
        q = q.filter_by(role=role)
    if is_active is not None:
        q = q.filter_by(is_active=is_active.lower() == "true")

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "users":    [u.to_dict() for u in paginated.items],
        "total":    paginated.total,
        "page":     page,
        "per_page": per_page,
    }), 200


@users_bp.post("/")
@role_required("admin")
def create_user():
    """Create a new user.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    data = request.get_json(silent=True) or {}

    required = ["username", "email", "password", "full_name", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    if data["role"] not in User.VALID_ROLES:
        return jsonify({"error": f"Invalid role. Choose from {sorted(User.VALID_ROLES)}", "field": "role"}), 400
    if not _EMAIL_RE.match(data["email"]):
        return jsonify({"error": "Invalid email format", "field": "email"}), 400
    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters", "field": "password"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already exists"}), 409
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already exists"}), 409

    user = User(
        username=data["username"],
        email=data["email"],
        full_name=data["full_name"],
        role=data["role"],
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@users_bp.get("/<int:user_id>")
@role_required("admin")
def get_user(user_id: int):
    """Get a user by ID.
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@users_bp.put("/<int:user_id>")
@role_required("admin")
def update_user(user_id: int):
    """Update user attributes (full_name, role, is_active only).
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    if "role" in data:
        if data["role"] not in User.VALID_ROLES:
            return jsonify({"error": "Invalid role", "field": "role"}), 400
        user.role = data["role"]
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(user.to_dict()), 200


@users_bp.delete("/<int:user_id>")
@role_required("admin")
def deactivate_user(user_id: int):
    """Soft-delete a user (sets is_active=False).
    ---
    tags: [Users]
    security: [{BearerAuth: []}]
    """
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({"error": "Cannot deactivate your own account"}), 400

    user = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    user.is_active  = False
    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "User deactivated"}), 200
