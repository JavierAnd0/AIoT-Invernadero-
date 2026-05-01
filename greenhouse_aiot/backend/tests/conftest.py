"""Pytest fixtures for the AIoT Greenhouse backend test suite.

Uses SQLite in-file database (TestingConfig) so no PostgreSQL is needed.
The D4 AI predict function is patched at the service level so model files
are not required to run the tests.
"""

import os
import sys
from unittest.mock import MagicMock

import pytest

# ── Patch D4 predict BEFORE any service module is imported ───────────────────
_MOCK_PREDICTION = {
    "predicted_class":   "optimal",
    "confidence":        0.9234,
    "raw_probabilities": {"critical": 0.02, "optimal": 0.92, "warning": 0.06},
    "model_name":        "random_forest",
    "model_version":     "1.0.0",
    "input_features": {
        "temperature": 20.0, "humidity": 65.0, "ph": 6.5,
        "light_lux": 25000.0, "co2_ppm": 900.0, "soil_moisture": 60.0,
    },
}

# Patch at the service module level so routes see the mock
import services.prediction_service as _ps
_ps._predict = lambda features, model_name="random_forest": _MOCK_PREDICTION


# ── Application fixture ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    """Create a test Flask application backed by a temporary SQLite database."""
    from app import create_app
    from models import db as _db

    test_app = create_app("testing")

    with test_app.app_context():
        _db.create_all()
        _seed_database(_db)

    yield test_app

    # Teardown: drop tables and remove SQLite file
    with test_app.app_context():
        _db.drop_all()
    db_path = os.path.join(os.path.dirname(__file__), "..", "test_greenhouse.db")
    try:
        os.remove(db_path)
    except FileNotFoundError:
        pass


@pytest.fixture(scope="session")
def client(app):
    """Return a Flask test client."""
    return app.test_client()


# ── Auth token fixtures ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def admin_token(client):
    """JWT token for the admin user."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin1234!"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.get_json()}"
    return resp.get_json()["token"]


@pytest.fixture(scope="session")
def operator_token(client):
    """JWT token for the operator user."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "operator1", "password": "Operator1234!"},
    )
    assert resp.status_code == 200, f"Operator login failed: {resp.get_json()}"
    return resp.get_json()["token"]


@pytest.fixture(scope="session")
def viewer_token(client):
    """JWT token for the viewer user."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer1", "password": "Viewer1234!"},
    )
    assert resp.status_code == 200, f"Viewer login failed: {resp.get_json()}"
    return resp.get_json()["token"]


# ── Database seed ─────────────────────────────────────────────────────────────

def _seed_database(db) -> None:
    """Populate the test database with minimal seed data."""
    from models.crop_type import CropType
    from models.device import Device
    from models.user import User
    from models.zone import Zone

    # Users
    admin = User(username="admin", email="admin@greenhouse.io",
                 full_name="System Administrator", role="admin", is_active=True)
    admin.set_password("Admin1234!")

    operator = User(username="operator1", email="op1@greenhouse.io",
                    full_name="Carlos Mendez", role="operator", is_active=True)
    operator.set_password("Operator1234!")

    viewer = User(username="viewer1", email="viewer1@greenhouse.io",
                  full_name="Ana Gomez", role="viewer", is_active=True)
    viewer.set_password("Viewer1234!")

    db.session.add_all([admin, operator, viewer])
    db.session.flush()

    # Zones
    zone_a = Zone(name="Zone A - Leafy Greens",
                  description="North section for lettuce and spinach", area_m2=48.0)
    zone_b = Zone(name="Zone B - Tomatoes",
                  description="Central section with trellis support", area_m2=60.0)
    db.session.add_all([zone_a, zone_b])
    db.session.flush()

    # Devices (simulated)
    device_a = Device(zone_id=zone_a.zone_id, registered_by=admin.user_id,
                      name="Sensor Node ZA-01", serial_number="SIM-ZA-001",
                      device_type="simulated", status="online")
    db.session.add(device_a)
    db.session.flush()

    # Crop types
    lettuce = CropType(
        name="Lettuce", scientific_name="Lactuca sativa",
        temp_min=15.0, temp_max=24.0, temp_optimal=20.0,
        humidity_min=50.0, humidity_max=80.0,
        ph_min=6.0, ph_max=7.0,
        light_min_lux=10000.0, light_max_lux=40000.0,
        growth_days=45,
    )
    db.session.add(lettuce)
    db.session.commit()
