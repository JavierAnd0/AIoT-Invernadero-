"""Application configuration for development, production, and testing environments."""

import os
from datetime import timedelta


class Config:
    """Base configuration shared by all environments."""

    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=24)
    JWT_ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")

    # AI module
    AI_MODELS_PATH: str = os.environ.get("AI_MODELS_PATH", "../ai/models")
    DEFAULT_MODEL: str = "random_forest"

    # IoT simulator
    SIMULATOR_INTERVAL: int = int(os.environ.get("SIMULATOR_INTERVAL", "15"))

    # OAuth2 Google
    GOOGLE_CLIENT_ID:     str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    FRONTEND_URL:         str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    PREFERRED_URL_SCHEME: str = os.environ.get("PREFERRED_URL_SCHEME", "https")


class DevelopmentConfig(Config):
    """Development configuration with SQLite fallback."""

    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/greenhouse_dev",
    )
    SQLALCHEMY_ECHO: bool = False


class ProductionConfig(Config):
    """Production configuration — DATABASE_URL must be set in environment."""

    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL", "")


class TestingConfig(Config):
    """In-memory SQLite configuration for the pytest suite."""

    TESTING: bool = True
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///test_greenhouse.db"
    # Disable CSRF / session protection in tests
    WTF_CSRF_ENABLED: bool = False
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=1)


config_map: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
}
