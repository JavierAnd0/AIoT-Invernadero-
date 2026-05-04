"""Authentication routes — login, register, OAuth2, logout, and current-user."""

import logging
from datetime import datetime

from flask import Blueprint, current_app, jsonify, redirect, request, url_for
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from models import db
from models.user import User

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


# ── POST /auth/login — local username+password ─────────────────────────────
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

    if user is None or user.auth_provider != "local" or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role},
    )
    return jsonify({"token": token, "user": user.to_dict()}), 200


# ── POST /auth/register — registro local con email+password ───────────────
@auth_bp.post("/register")
def register():
    """Register a new local user. New accounts always get role='viewer'.
    ---
    tags: [Auth]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [username, email, password, full_name]
          properties:
            username:  {type: string}
            email:     {type: string}
            password:  {type: string, minLength: 8}
            full_name: {type: string}
    responses:
      201:
        description: User created
      400:
        description: Validation error
      409:
        description: Username or email already taken
    """
    data = request.get_json(silent=True) or {}

    required = ["username", "email", "password", "full_name"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        username=data["username"],
        email=data["email"],
        full_name=data["full_name"],
        role="viewer",
        auth_provider="local",
        is_active=True,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role},
    )
    return jsonify({"token": token, "user": user.to_dict()}), 201


# ── GET /auth/google — inicia el flujo OAuth2 ─────────────────────────────
@auth_bp.get("/google")
def google_login():
    """Redirect user to Google OAuth2 consent screen.
    ---
    tags: [Auth]
    responses:
      302:
        description: Redirect to Google
    """
    oauth = current_app.extensions["oauth"]
    redirect_uri = url_for(
        "auth.google_callback",
        _external=True,
        _scheme=current_app.config.get("PREFERRED_URL_SCHEME", "https"),
    )
    return oauth.google.authorize_redirect(redirect_uri)


# ── GET /auth/google/callback — Google llama aquí tras el login ───────────
@auth_bp.get("/google/callback")
def google_callback():
    """Handle Google OAuth2 callback: create/update user, return JWT via redirect.
    ---
    tags: [Auth]
    responses:
      302:
        description: Redirect to frontend with token or error
    """
    frontend_url = current_app.config["FRONTEND_URL"]
    try:
        oauth = current_app.extensions["oauth"]
        token = oauth.google.authorize_access_token()
        user_info = token.get("userinfo")

        if not user_info:
            return redirect(f"{frontend_url}/auth/callback?error=no_userinfo")

        google_id  = user_info["sub"]
        email      = user_info["email"]
        full_name  = user_info.get("name", email.split("@")[0])
        avatar_url = user_info.get("picture")

        user = (
            User.query.filter_by(google_id=google_id).first()
            or User.query.filter_by(email=email).first()
        )

        if user:
            user.google_id     = google_id
            user.avatar_url    = avatar_url
            user.auth_provider = "google"
            user.updated_at    = datetime.utcnow()
        else:
            base = email.split("@")[0].replace(".", "_")
            username = base
            counter  = 1
            while User.query.filter_by(username=username).first():
                username = f"{base}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=email,
                full_name=full_name,
                role="viewer",
                auth_provider="google",
                google_id=google_id,
                avatar_url=avatar_url,
                is_active=True,
            )
            db.session.add(user)

        db.session.commit()

        if not user.is_active:
            return redirect(f"{frontend_url}/auth/callback?error=account_deactivated")

        jwt_token = create_access_token(
            identity=str(user.user_id),
            additional_claims={"role": user.role},
        )
        return redirect(f"{frontend_url}/auth/callback?token={jwt_token}")

    except Exception as e:
        logger.error("OAuth callback error: %s", e)
        return redirect(f"{frontend_url}/auth/callback?error=oauth_failed")


# ── POST /auth/logout ──────────────────────────────────────────────────────
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


# ── GET /auth/me ───────────────────────────────────────────────────────────
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
