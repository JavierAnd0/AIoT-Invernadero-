"""Authentication routes — login, logout, and current-user endpoints."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    """Authenticate a user and return a JWT access token.
    ---
    tags: [Auth]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [username, password]
          properties:
            username: {type: string}
            password: {type: string}
    responses:
      200:
        description: Successful login
      401:
        description: Invalid credentials
      403:
        description: Account deactivated
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role},
    )
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.post("/logout")
@jwt_required()
def logout():
    """Logout — JWT is stateless; the client must discard the token.
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Logged out
    """
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user's profile.
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Current user
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200
