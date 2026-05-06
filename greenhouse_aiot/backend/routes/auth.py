"""Authentication routes — login, bootstrap, OAuth2, tenant selection, logout, me.

Auth flow changes from the original single-tenant version
---------------------------------------------------------
1. /auth/register is REPLACED by /auth/bootstrap (first-user only).
   Open registration is removed — subsequent users are invited by a tenant admin.

2. JWT now carries ``tenant_id`` instead of ``role``.
   Roles are read from ``tenant_memberships`` on every request (tenant_required
   decorator), so a role change takes effect immediately without re-login.

3. Google OAuth no longer overwrites auth_provider on existing local users.
   A user created with a password can also link their Google account without
   losing password-based login.

4. /auth/select-tenant lets multi-tenant users switch context and receive a
   new JWT scoped to the chosen tenant.
"""

import logging
import re
from datetime import datetime

from flask import Blueprint, current_app, jsonify, redirect, request, url_for
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from models import db
from models.tenant import Tenant
from models.tenant_membership import TenantMembership
from models.user import User

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_token(user_id: int, tenant_id: int | None) -> str:
    """Issue a JWT with the given tenant context (None = tenant not selected yet)."""
    return create_access_token(
        identity=str(user_id),
        additional_claims={"tenant_id": tenant_id},
    )


def _membership_list(user_id: int) -> list[dict]:
    """Return serialised tenant memberships for a user."""
    memberships = (
        TenantMembership.query
        .filter_by(user_id=user_id, is_active=True)
        .all()
    )
    return [
        {
            "tenant_id": m.tenant_id,
            "name":      m.tenant.name,
            "slug":      m.tenant.slug,
            "role":      m.role,
        }
        for m in memberships
    ]


def _login_response(user: "User") -> tuple:
    """Build the standard login response payload.

    If the user belongs to exactly one tenant the JWT is pre-scoped to it.
    If they belong to multiple tenants the token has tenant_id=None and the
    frontend must call POST /auth/select-tenant.
    """
    tenants = _membership_list(user.user_id)

    if not tenants:
        return jsonify({"error": "User has no tenant memberships. Contact your administrator."}), 403

    tenant_id = tenants[0]["tenant_id"] if len(tenants) == 1 else None
    token     = _make_token(user.user_id, tenant_id)

    return jsonify({
        "token":                    token,
        "user":                     user.to_dict(),
        "tenants":                  tenants,
        "requires_tenant_selection": tenant_id is None,
    }), 200


# ── POST /auth/login — local username + password ──────────────────────────────
@auth_bp.post("/login")
def login():
    """Authenticate a user with username + password and return a JWT.
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
        description: Successful login — token + tenant list
      401:
        description: Invalid credentials
      403:
        description: Account deactivated or no tenant memberships
    """
    # force=True parses body as JSON even if Content-Type header is missing/wrong
    # (can happen behind Nginx/Dokploy proxy that strips headers)
    data     = request.get_json(force=True, silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    user = User.query.filter_by(username=username).first()

    # auth_provider must be "local" AND the password must match.
    # A user who originally registered locally but later also linked Google
    # still has auth_provider="local", so password login remains valid.
    if user is None or user.auth_provider not in ("local",) or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    return _login_response(user)


# ── POST /auth/bootstrap — first-user setup ───────────────────────────────────
@auth_bp.post("/bootstrap")
def bootstrap():
    """Create the very first user + tenant when the system is empty.

    This endpoint is only available while the users table is empty.
    It creates the tenant, an admin user, and the initial tenant membership.
    ---
    tags: [Auth]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [username, email, password, full_name, tenant_name]
          properties:
            username:    {type: string}
            email:       {type: string}
            password:    {type: string, minLength: 8}
            full_name:   {type: string}
            tenant_name: {type: string, description: "Display name for the organisation"}
    responses:
      201:
        description: System bootstrapped — first tenant + admin created
      400:
        description: Validation error
      409:
        description: System already initialised (users exist)
    """
    if User.query.count() > 0:
        return jsonify({"error": "System already initialised. Use /auth/login."}), 409

    data = request.get_json(silent=True) or {}

    required = ["username", "email", "password", "full_name", "tenant_name"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Create tenant
    slug   = Tenant.slugify(data["tenant_name"])
    tenant = Tenant(name=data["tenant_name"], slug=slug)
    db.session.add(tenant)
    db.session.flush()  # assigns tenant_id before we reference it

    # Create admin user
    user = User(
        username=data["username"],
        email=data["email"],
        full_name=data["full_name"],
        auth_provider="local",
        is_active=True,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()  # assigns user_id

    # Create admin membership
    membership = TenantMembership(
        tenant_id=tenant.tenant_id,
        user_id=user.user_id,
        role="admin",
        is_active=True,
    )
    db.session.add(membership)
    db.session.commit()

    token = _make_token(user.user_id, tenant.tenant_id)
    return jsonify({
        "token":   token,
        "user":    user.to_dict(),
        "tenants": [{"tenant_id": tenant.tenant_id, "name": tenant.name, "slug": tenant.slug, "role": "admin"}],
        "requires_tenant_selection": False,
    }), 201


# ── POST /auth/select-tenant — switch active tenant ───────────────────────────
@auth_bp.post("/select-tenant")
@jwt_required()
def select_tenant():
    """Issue a new JWT scoped to the chosen tenant.

    Use when a user belongs to more than one tenant (requires_tenant_selection=true).
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [tenant_id]
          properties:
            tenant_id: {type: integer}
    responses:
      200:
        description: New scoped token
      403:
        description: Not a member of that tenant
      404:
        description: Tenant not found
    """
    user_id   = int(get_jwt_identity())
    data      = request.get_json(silent=True) or {}
    tenant_id = data.get("tenant_id")

    if not tenant_id:
        return jsonify({"error": "tenant_id is required"}), 400

    membership = TenantMembership.query.filter_by(
        user_id=user_id, tenant_id=tenant_id, is_active=True
    ).first()
    if membership is None:
        return jsonify({"error": "Not a member of this tenant"}), 403

    token = _make_token(user_id, tenant_id)
    return jsonify({
        "token":      token,
        "tenant_id":  tenant_id,
        "role":       membership.role,
    }), 200


# ── GET /auth/google — start OAuth2 flow ─────────────────────────────────────
@auth_bp.get("/google")
def google_login():
    """Redirect user to Google OAuth2 consent screen.
    ---
    tags: [Auth]
    responses:
      302:
        description: Redirect to Google
    """
    oauth       = current_app.extensions["oauth"]
    redirect_uri = url_for(
        "auth.google_callback",
        _external=True,
        _scheme=current_app.config.get("PREFERRED_URL_SCHEME", "https"),
    )
    return oauth.google.authorize_redirect(redirect_uri)


# ── GET /auth/google/callback ─────────────────────────────────────────────────
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
        oauth     = current_app.extensions["oauth"]
        token     = oauth.google.authorize_access_token()
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

        if not user:
            # Bootstrap: allow creating the first admin via Google if the DB is empty.
            if User.query.count() > 0:
                return redirect(f"{frontend_url}/auth/callback?error=account_not_found")

            base     = email.split("@")[0].replace(".", "_")
            tenant   = Tenant(name=base.capitalize(), slug=Tenant.slugify(base))
            db.session.add(tenant)
            db.session.flush()

            user = User(
                username=base,
                email=email,
                full_name=full_name,
                auth_provider="google",
                google_id=google_id,
                avatar_url=avatar_url,
                is_active=True,
            )
            db.session.add(user)
            db.session.flush()

            db.session.add(TenantMembership(
                tenant_id=tenant.tenant_id,
                user_id=user.user_id,
                role="admin",
            ))
        else:
            # ── FIX Fallo 2: never overwrite auth_provider if user has a local password ──
            # Link the Google account without destroying the existing login method.
            user.google_id  = google_id
            user.avatar_url = avatar_url
            if not user.password_hash:
                # Pure Google user (no local password) — keep provider as google
                user.auth_provider = "google"
            # If user already has a local password, leave auth_provider="local"
            # so they can still log in with their password too.
            user.updated_at = datetime.utcnow()

        db.session.commit()

        if not user.is_active:
            return redirect(f"{frontend_url}/auth/callback?error=account_deactivated")

        # Build tenant-scoped token
        tenants   = _membership_list(user.user_id)
        tenant_id = tenants[0]["tenant_id"] if len(tenants) == 1 else None
        jwt_token = _make_token(user.user_id, tenant_id)

        requires = "true" if tenant_id is None else "false"
        return redirect(
            f"{frontend_url}/auth/callback?token={jwt_token}&requires_tenant_selection={requires}"
        )

    except Exception as e:
        logger.error("OAuth callback error: %s", e)
        return redirect(f"{frontend_url}/auth/callback?error=oauth_failed")


# ── POST /auth/logout ─────────────────────────────────────────────────────────
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


# ── GET /auth/me ──────────────────────────────────────────────────────────────
@auth_bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user's profile and tenant list.
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Current user + tenants
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user":    user.to_dict(),
        "tenants": _membership_list(user_id),
    }), 200


# ── PATCH /auth/profile — update own profile ──────────────────────────────────
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

@auth_bp.patch("/profile")
@jwt_required()
def update_profile():
    """Update the authenticated user's own profile (full_name, email).

    Username cannot be changed — it is used as a stable identifier.
    Google-managed fields (avatar_url, google_id) are read-only here.
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        schema:
          type: object
          properties:
            full_name: {type: string}
            email:     {type: string, format: email}
    responses:
      200:
        description: Updated user profile
      400:
        description: Validation error
      409:
        description: Email already in use by another account
    """
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}

    if "full_name" in data:
        full_name = data["full_name"].strip()
        if not full_name:
            return jsonify({"error": "full_name cannot be empty"}), 400
        user.full_name = full_name

    if "email" in data:
        email = data["email"].strip().lower()
        if not _EMAIL_RE.match(email):
            return jsonify({"error": "Invalid email format"}), 400
        conflict = User.query.filter(
            User.email == email,
            User.user_id != user_id,
        ).first()
        if conflict:
            return jsonify({"error": "Email already in use by another account"}), 409
        user.email = email

    if "language" in data:
        language = data["language"].strip().lower()
        if language not in User.VALID_LANGUAGES:
            return jsonify({"error": f"Invalid language. Choose from {sorted(User.VALID_LANGUAGES)}"}), 400
        user.language = language

    if "theme" in data:
        theme = data["theme"].strip().lower()
        if theme not in User.VALID_THEMES:
            return jsonify({"error": f"Invalid theme. Choose from {sorted(User.VALID_THEMES)}"}), 400
        user.theme = theme

    if not any(k in data for k in ("full_name", "email", "language", "theme")):
        return jsonify({"error": "No updatable fields provided (full_name, email)"}), 400

    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200


# ── POST /auth/change-password ────────────────────────────────────────────────
@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    """Change the authenticated user's password.

    Only available for local (password-based) accounts.
    Google-only accounts cannot set a password here.
    ---
    tags: [Auth]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        required: true
        schema:
          type: object
          required: [current_password, new_password]
          properties:
            current_password: {type: string}
            new_password:     {type: string, minLength: 8}
    responses:
      200:
        description: Password updated
      400:
        description: Validation error or not a local account
      401:
        description: Current password incorrect
    """
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    if not user.password_hash:
        return jsonify({
            "error": "Your account uses Google Sign-In — password change is not available."
        }), 400

    data             = request.get_json(silent=True) or {}
    current_password = data.get("current_password", "")
    new_password     = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"error": "current_password and new_password are required"}), 400

    if not user.check_password(current_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    if current_password == new_password:
        return jsonify({"error": "New password must be different from the current one"}), 400

    user.set_password(new_password)
    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200
