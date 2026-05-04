"""Application factory for the AIoT Greenhouse REST API.

Usage:
    flask run --port=5000          # development
    gunicorn "app:create_app()"    # production
    pytest tests/                  # testing
"""

import os

from dotenv import load_dotenv
from flasgger import Swagger
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()

from authlib.integrations.flask_client import OAuth
from config import config_map
from models import db, jwt, migrate


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application (factory pattern).

    Args:
        config_name: One of "development", "production", "testing".
                     Falls back to the FLASK_ENV environment variable,
                     then to "development".
    """
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")
    if config_name not in config_map:
        config_name = "development"

    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config["CORS_ORIGINS"]
    # Always allow Vercel preview and production deployments
    cors_origins = list(cors_origins) + [r"https://.*\.vercel\.app"]
    CORS(app, origins=cors_origins, supports_credentials=True)

    # ── OAuth2 (Authlib) ──────────────────────────────────────────────────────
    oauth = OAuth()
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    app.extensions["oauth"] = oauth

    # ── Swagger / Flasgger ────────────────────────────────────────────────────
    app.config["SWAGGER"] = {
        "title":       "AIoT Greenhouse API",
        "description": (
            "REST API for the AIoT Greenhouse Management System. "
            "Coherent with D1 (PostgreSQL schema), D3 (GreenCore React app), "
            "and D4 (ML prediction module)."
        ),
        "version":     "1.0.0",
        "uiversion":   3,
        "securityDefinitions": {
            "BearerAuth": {
                "type": "apiKey",
                "name": "Authorization",
                "in":   "header",
                "description": "Enter: Bearer <token>",
            }
        },
    }
    Swagger(app)

    # ── Blueprints ────────────────────────────────────────────────────────────
    from routes.auth        import auth_bp
    from routes.users       import users_bp
    from routes.zones       import zones_bp
    from routes.devices     import devices_bp
    from routes.readings    import readings_bp
    from routes.crop_types  import crop_types_bp
    from routes.crops       import crops_bp
    from routes.alerts      import alerts_bp
    from routes.predictions import predictions_bp
    from routes.simulator   import simulator_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/v1/auth")
    app.register_blueprint(users_bp,       url_prefix="/api/v1/users")
    app.register_blueprint(zones_bp,       url_prefix="/api/v1/zones")
    app.register_blueprint(devices_bp,     url_prefix="/api/v1/devices")
    app.register_blueprint(readings_bp,    url_prefix="/api/v1/readings")
    app.register_blueprint(crop_types_bp,  url_prefix="/api/v1/crop-types")
    app.register_blueprint(crops_bp,       url_prefix="/api/v1/crops")
    app.register_blueprint(alerts_bp,      url_prefix="/api/v1/alerts")
    app.register_blueprint(predictions_bp, url_prefix="/api/v1")       # /predict + /predictions
    app.register_blueprint(simulator_bp,   url_prefix="/api/v1/simulator")

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable entity"}), 422

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    application = create_app(os.environ.get("FLASK_ENV", "development"))
    application.run(host="0.0.0.0", port=5000, debug=application.config["DEBUG"])
