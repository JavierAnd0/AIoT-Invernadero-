"""Pytest fixtures for the AIoT Greenhouse backend test suite.

Uses SQLite (TestingConfig) — no PostgreSQL required.
The D4 AI predict function is patched at the service level so model files
are never needed during tests.

Multi-tenant seed layout
-------------------------
  Tenant : "Test Greenhouse" (tenant_id assigned by DB)
  Users  : admin / operator1 / viewer1  (no global role column)
  Memberships : admin→admin, operator1→operator, viewer1→viewer (all in same tenant)
  Zone   : "Zone A" (tenant-scoped)
  Device : "Sensor ZA-01" (tenant-scoped, linked to Zone A)
  CropType: Lettuce
"""

import os
import sys
from datetime import datetime

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

    with test_app.app_context():
        _db.drop_all()

    db_path = os.path.join(os.path.dirname(__file__), "..", "test_greenhouse.db")
    try:
        os.remove(db_path)
    except FileNotFoundError:
        pass


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


# ── Auth token fixtures ───────────────────────────────────────────────────────
# All tokens are obtained via POST /auth/login and already contain tenant_id.

@pytest.fixture(scope="session")
def admin_token(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin1234!"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.get_json()}"
    return resp.get_json()["token"]


@pytest.fixture(scope="session")
def operator_token(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "operator1", "password": "Operator1234!"},
    )
    assert resp.status_code == 200, f"Operator login failed: {resp.get_json()}"
    return resp.get_json()["token"]


@pytest.fixture(scope="session")
def viewer_token(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer1", "password": "Viewer1234!"},
    )
    assert resp.status_code == 200, f"Viewer login failed: {resp.get_json()}"
    return resp.get_json()["token"]


# ── Seeded-object ID helpers ──────────────────────────────────────────────────
# Tests that need a real device_id or zone_id should use these fixtures
# instead of hardcoding "1" — the DB auto-assigns PKs.

@pytest.fixture(scope="session")
def seeded_device_id(app):
    """Return the device_id of the device created by _seed_database."""
    from models.device import Device
    with app.app_context():
        d = Device.query.filter_by(serial_number="SIM-ZA-001").first()
        assert d is not None, "Seed device not found"
        return d.device_id


@pytest.fixture(scope="session")
def seeded_tenant_id(app):
    """Return the tenant_id created by _seed_database."""
    from models.tenant import Tenant
    with app.app_context():
        t = Tenant.query.filter_by(slug="test-greenhouse").first()
        assert t is not None, "Seed tenant not found"
        return t.tenant_id


# ── Database seed ─────────────────────────────────────────────────────────────

def _seed_database(db) -> None:
    """Populate the test database with tenant-aware seed data."""
    from models.crop_type import CropType
    from models.device import Device
    from models.tenant import Tenant
    from models.tenant_membership import TenantMembership
    from models.user import User
    from models.zone import Zone

    # ── Tenant ────────────────────────────────────────────────────────────────
    tenant = Tenant(
        name="Test Greenhouse",
        slug="test-greenhouse",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db.session.add(tenant)
    db.session.flush()  # assigns tenant_id

    # ── Users (no global role column) ─────────────────────────────────────────
    admin = User(
        username="admin", email="admin@greenhouse.io",
        full_name="System Administrator",
        auth_provider="local", is_active=True,
    )
    admin.set_password("Admin1234!")

    operator = User(
        username="operator1", email="op1@greenhouse.io",
        full_name="Carlos Mendez",
        auth_provider="local", is_active=True,
    )
    operator.set_password("Operator1234!")

    viewer = User(
        username="viewer1", email="viewer1@greenhouse.io",
        full_name="Ana Gomez",
        auth_provider="local", is_active=True,
    )
    viewer.set_password("Viewer1234!")

    db.session.add_all([admin, operator, viewer])
    db.session.flush()  # assigns user_ids

    # ── Tenant memberships ─────────────────────────────────────────────────────
    db.session.add_all([
        TenantMembership(tenant_id=tenant.tenant_id, user_id=admin.user_id,    role="admin",    is_active=True, created_at=datetime.utcnow()),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=operator.user_id, role="operator", is_active=True, created_at=datetime.utcnow()),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=viewer.user_id,   role="viewer",   is_active=True, created_at=datetime.utcnow()),
    ])
    db.session.flush()

    # ── Zone (tenant-scoped) ──────────────────────────────────────────────────
    zone_a = Zone(
        tenant_id=tenant.tenant_id,
        name="Zone A - Leafy Greens",
        description="North section for lettuce and spinach",
        area_m2=48.0,
    )
    db.session.add(zone_a)
    db.session.flush()

    # ── Device (tenant-scoped) ────────────────────────────────────────────────
    device_a = Device(
        tenant_id=tenant.tenant_id,
        zone_id=zone_a.zone_id,
        registered_by=admin.user_id,
        name="Sensor Node ZA-01",
        serial_number="SIM-ZA-001",
        device_type="simulated",
        status="online",
    )
    db.session.add(device_a)
    db.session.flush()

    # ── Crop type (global reference data, no tenant_id) ───────────────────────
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
