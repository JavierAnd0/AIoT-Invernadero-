"""Route utilities shared across all blueprints.

Exports:
  role_required(*roles) — JWT auth + role enforcement decorator.
"""

from functools import wraps
from typing import Callable

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(*roles: str) -> Callable:
    """Decorator that enforces JWT authentication and validates user role.

    Usage:
        @role_required("admin")
        @role_required("admin", "operator")
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
