"""User model — maps to the `users` table defined in D1 schema.sql."""

from datetime import datetime

import bcrypt

from models import db


class User(db.Model):
    """System user with role-based access control (admin / operator / viewer)."""

    __tablename__ = "users"

    user_id       = db.Column(db.Integer,     primary_key=True)
    username      = db.Column(db.String(80),  nullable=False, unique=True)
    email         = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name     = db.Column(db.String(150), nullable=False)
    role          = db.Column(db.String(20),  nullable=False, default="viewer")
    is_active     = db.Column(db.Boolean,     nullable=False, default=True)
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    VALID_ROLES: frozenset[str] = frozenset({"admin", "operator", "viewer"})

    # ── Relationships ─────────────────────────────────────────────────────────
    registered_devices = db.relationship(
        "Device", backref="registrar",
        lazy=True, foreign_keys="Device.registered_by",
    )
    created_crops = db.relationship(
        "Crop", backref="creator",
        lazy=True, foreign_keys="Crop.created_by",
    )
    assigned_alerts = db.relationship(
        "Alert", backref="assignee",
        lazy=True, foreign_keys="Alert.assigned_to",
    )

    # ── Password helpers ──────────────────────────────────────────────────────

    def set_password(self, password: str) -> None:
        """Hash *password* with bcrypt and store it."""
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password: str) -> bool:
        """Return True if *password* matches the stored bcrypt hash."""
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict. Never includes password_hash."""
        return {
            "user_id":    self.user_id,
            "username":   self.username,
            "email":      self.email,
            "full_name":  self.full_name,
            "role":       self.role,
            "is_active":  self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
