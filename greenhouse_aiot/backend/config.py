"""Application configuration for development, production, and testing environments."""

import os
from datetime import timedelta

# Sentinel values that flag "no real secret was configured"
_DEV_SENTINEL_SECRETS = frozenset({
    "dev-secret-change-in-prod",
    "dev-jwt-secret-change-in-prod",
    "",
})


class Config:
    """Base configuration shared by all environments."""

    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=24)
    JWT_ALGORITHM: str = "HS256"

    # CORS — comma-separated list from env; wildcard Vercel previews opt-in
    CORS_ORIGINS: list[str] = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")
    # Set ALLOW_VERCEL_PREVIEWS=true in env to allow any *.vercel.app origin.
    # Useful for preview deployments, but disabled by default in production.
    ALLOW_VERCEL_PREVIEWS: bool = os.environ.get(
        "ALLOW_VERCEL_PREVIEWS", "false"
    ).lower() == "true"

    # AI module
    AI_MODELS_PATH: str = os.environ.get("AI_MODELS_PATH", "../ai/models")
    DEFAULT_MODEL: str = "random_forest"

    # IoT simulator
    SIMULATOR_INTERVAL: int = int(os.environ.get("SIMULATOR_INTERVAL", "15"))

    # OAuth2 Google
    GOOGLE_CLIENT_ID:     str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    FRONTEND_URL:         str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    PREFERRED_URL_SCHEME: str = os.environ.get("PREFERRED_URL_SCHEME", "http")


class DevelopmentConfig(Config):
    """Development configuration with PostgreSQL fallback to localhost."""

    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/greenhouse_dev",
    )
    SQLALCHEMY_ECHO: bool = False
    # Allow Vercel previews in dev by default
    ALLOW_VERCEL_PREVIEWS: bool = True


class ProductionConfig(Config):
    """Production configuration — critical env vars must be set explicitly.

    The application factory (app.py) validates that SECRET_KEY and
    JWT_SECRET_KEY are not the dev-time placeholder values before serving
    any request.  If they are missing the server refuses to start.
    """

    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL", "")
    PREFERRED_URL_SCHEME: str = os.environ.get("PREFERRED_URL_SCHEME", "https")
    # Vercel previews are opt-in in production (default off)
    ALLOW_VERCEL_PREVIEWS: bool = os.environ.get(
        "ALLOW_VERCEL_PREVIEWS", "false"
    ).lower() == "true"


class TestingConfig(Config):
    """In-memory SQLite configuration for the pytest suite."""

    TESTING: bool = True
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///test_greenhouse.db"
    WTF_CSRF_ENABLED: bool = False
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=1)


config_map: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
}
