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

# Import all models so Alembic autogenerate and Flask-Migrate can detect them.
# Order: independent tables first, then tables with foreign keys.
# Each model does `from models import db` which resolves to this module — that's fine
# because `db` is already assigned above before these imports are processed.
from models.tenant            import Tenant             # noqa: F401, E402
from models.tenant_membership import TenantMembership   # noqa: F401, E402
from models.user              import User               # noqa: F401, E402
from models.zone              import Zone               # noqa: F401, E402
from models.crop_type         import CropType           # noqa: F401, E402
from models.device            import Device             # noqa: F401, E402
from models.crop              import Crop               # noqa: F401, E402
from models.sensor_reading    import SensorReading      # noqa: F401, E402
from models.alert             import Alert              # noqa: F401, E402
from models.prediction        import Prediction         # noqa: F401, E402
