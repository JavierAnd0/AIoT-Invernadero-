"""Shared SQLAlchemy, JWT, and Migrate extension instances.

Import `db`, `jwt`, and `migrate` from this module everywhere in the app.
They are initialised against the Flask app in `app.create_app()`.
"""

from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
