"""Route utilities shared across all blueprints.

Exports:
  tenant_required(*roles) — JWT auth + tenant isolation + live role check.
  superadmin_required()   — global platform admin (not tied to any tenant).
"""

from functools import wraps
from typing import Callable

from flask import g, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request


def tenant_required(*roles: str) -> Callable:
    """Decorator that:

    1. Verifies the JWT is present and valid.
    2. Extracts ``tenant_id`` from the JWT claims.
    3. Queries ``TenantMembership`` from the DB — this fixes the stale-role
       flaw: roles are *always* read fresh, never trusted from the token.
    4. Enforces that the caller's live role is in *roles* (if any supplied).
    5. Injects ``g.tenant_id``, ``g.user_id``, and ``g.current_role`` so
       route handlers don't need to repeat the DB call.

    Usage::

        @bp.get("/")
        @tenant_required()                          # any role is fine
        def list():  ...

        @bp.post("/")
        @tenant_required("admin", "operator")       # only admin / operator
        def create():  ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims    = get_jwt()
            user_id   = int(get_jwt_identity())
            tenant_id = claims.get("tenant_id")

            if not tenant_id:
                return jsonify({"error": "No tenant context in token. Call POST /auth/select-tenant first."}), 401

            # ── Live role lookup — fixes the stale-JWT-role flaw ──────────────
            from models.tenant_membership import TenantMembership
            membership = TenantMembership.query.filter_by(
                user_id=user_id,
                tenant_id=tenant_id,
                is_active=True,
            ).first()

            if membership is None:
                return jsonify({"error": "Not a member of this tenant"}), 403

            if roles and membership.role not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403

            # ── Inject context for downstream handlers ────────────────────────
            g.tenant_id    = tenant_id
            g.user_id      = user_id
            g.current_role = membership.role

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def superadmin_required(fn: Callable) -> Callable:
    """Decorator for platform-level operations (tenant CRUD).

    Reads a ``superadmin`` flag from the JWT claims.  Set this claim when
    issuing tokens for platform administrators who are not scoped to any
    single tenant.

    Usage::

        @bp.get("/")
        @superadmin_required
        def list_all_tenants(): ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get("superadmin"):
            return jsonify({"error": "Platform admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper
