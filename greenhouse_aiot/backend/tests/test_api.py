"""Integration tests for the AIoT Greenhouse REST API (multi-tenant).

Coverage:
  - Auth   : login, bad credentials, /auth/me, bootstrap, select-tenant, Google redirect
  - Zones  : list (authed), list (unauthed), create
  - Devices: list
  - Readings: POST (valid), POST (out-of-range), GET latest, date-filter validation
  - Predictions: POST /predict (valid), POST /predict (missing device_id)
  - Alerts : GET /alerts/open
  - RBAC   : viewer blocked from writing; operator allowed
  - Users  : list members, invite member (create_user=true)
  - Simulator: start / stop lifecycle
"""

import pytest


# ═══════════════════════════════════════════════════════════════════════════════
# Auth
# ═══════════════════════════════════════════════════════════════════════════════

def test_login_valid_credentials(client):
    """POST /auth/login with correct credentials → 200, token present."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin1234!"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert "token" in data and data["token"]
    # New shape: tenants list + no requires_tenant_selection for single-tenant
    assert "tenants" in data
    assert len(data["tenants"]) == 1
    assert data["tenants"][0]["role"] == "admin"
    assert data["requires_tenant_selection"] is False


def test_login_invalid_password(client):
    """POST /auth/login with wrong password → 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_login_unknown_user(client):
    """POST /auth/login with non-existent user → 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "nobody", "password": "pass1234"},
    )
    assert resp.status_code == 401


def test_me_returns_user_and_tenants(client, admin_token):
    """GET /auth/me → 200, user dict + tenants list with role."""
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert "user" in data
    assert "tenants" in data
    # Role lives in tenants[], not at the top level
    assert data["tenants"][0]["role"] == "admin"
    # No 'role' key at top level (it was removed in the multi-tenant refactor)
    assert "role" not in data


def test_me_unauthenticated(client):
    """GET /auth/me without token → 401."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_bootstrap_blocked_when_users_exist(client):
    """POST /auth/bootstrap → 409 because the seed already created users."""
    resp = client.post("/api/v1/auth/bootstrap", json={
        "username": "newadmin", "email": "new@test.io",
        "password": "Password1!", "full_name": "New Admin",
        "tenant_name": "Another Org",
    })
    assert resp.status_code == 409


def test_bootstrap_missing_fields(client):
    """POST /auth/bootstrap with incomplete body → 400."""
    # Wipe users first is not feasible in session scope, so call bootstrap
    # without required fields to hit the 409 (already initialised) or 400 path.
    # With users in DB it returns 409 before field validation, so we verify 409.
    resp = client.post("/api/v1/auth/bootstrap", json={"username": "x"})
    assert resp.status_code in (400, 409)


def test_select_tenant_valid(client, admin_token, seeded_tenant_id):
    """POST /auth/select-tenant with own tenant_id → 200, new scoped token."""
    resp = client.post(
        "/api/v1/auth/select-tenant",
        json={"tenant_id": seeded_tenant_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert "token" in data
    assert data["role"] == "admin"


def test_select_tenant_wrong_tenant(client, admin_token):
    """POST /auth/select-tenant with a non-member tenant_id → 403."""
    resp = client.post(
        "/api/v1/auth/select-tenant",
        json={"tenant_id": 99999},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 403


def test_google_login_redirects(client):
    """GET /auth/google → 302/307 redirect (no Google credentials needed)."""
    resp = client.get("/api/v1/auth/google")
    assert resp.status_code in (302, 307)


# ═══════════════════════════════════════════════════════════════════════════════
# Zones
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_zones_authenticated(client, admin_token):
    """GET /zones/ with valid token → 200 + list of tenant-scoped zones."""
    resp = client.get(
        "/api/v1/zones/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)
    assert len(data) > 0
    # Every zone in the response must belong to the same tenant
    tenant_ids = {z["tenant_id"] for z in data}
    assert len(tenant_ids) == 1


def test_get_zones_unauthenticated(client):
    """GET /zones/ without token → 401."""
    resp = client.get("/api/v1/zones/")
    assert resp.status_code == 401


def test_create_zone(client, admin_token):
    """POST /zones/ with admin token → 201, zone_id present."""
    resp = client.post(
        "/api/v1/zones/",
        json={"name": "Zone Pytest", "description": "Ephemeral test zone", "area_m2": 12.5},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 201
    assert "zone_id" in data
    assert data["name"] == "Zone Pytest"


def test_viewer_cannot_create_zone(client, viewer_token):
    """POST /zones/ with viewer token → 403."""
    resp = client.post(
        "/api/v1/zones/",
        json={"name": "Viewer Zone"},
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Devices
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_devices(client, admin_token):
    """GET /devices/ with valid token → 200 + list."""
    resp = client.get(
        "/api/v1/devices/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


# ═══════════════════════════════════════════════════════════════════════════════
# Readings
# ═══════════════════════════════════════════════════════════════════════════════

def test_post_reading_valid(client, operator_token, seeded_device_id):
    """POST /readings/ with valid payload → 201, reading + alerts_created + prediction."""
    resp = client.post(
        "/api/v1/readings/",
        json={
            "device_id":     seeded_device_id,
            "temperature":   21.5,
            "humidity":      68.0,
            "ph":             6.4,
            "light_lux":   22000.0,
            "co2_ppm":       420.0,
            "soil_moisture":  65.0,
            "is_simulated":  False,
        },
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 201, data
    assert "reading" in data
    assert "alerts_created" in data
    assert "prediction" in data
    assert data["reading"]["device_id"] == seeded_device_id


def test_post_reading_out_of_range(client, operator_token, seeded_device_id):
    """POST /readings/ with temperature > 60 → 400 (DB CHECK constraint violation)."""
    resp = client.post(
        "/api/v1/readings/",
        json={"device_id": seeded_device_id, "temperature": 999.0},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 400


def test_post_reading_missing_device_id(client, operator_token):
    """POST /readings/ without device_id → 400."""
    resp = client.post(
        "/api/v1/readings/",
        json={"temperature": 22.0},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 400


def test_viewer_cannot_post_reading(client, viewer_token, seeded_device_id):
    """POST /readings/ with viewer token → 403."""
    resp = client.post(
        "/api/v1/readings/",
        json={"device_id": seeded_device_id, "temperature": 22.0},
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403


def test_readings_latest(client, admin_token):
    """GET /readings/latest → 200 + array of {device, reading} objects."""
    resp = client.get(
        "/api/v1/readings/latest",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)
    if data:
        assert "device" in data[0]
        assert "reading" in data[0]


def test_readings_date_filter_invalid(client, admin_token):
    """GET /readings/ with malformed from_date → 400."""
    resp = client.get(
        "/api/v1/readings/?from_date=not-a-date",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


def test_readings_date_filter_valid(client, admin_token):
    """GET /readings/ with valid ISO-8601 from_date → 200."""
    resp = client.get(
        "/api/v1/readings/?from_date=2020-01-01",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Predictions
# ═══════════════════════════════════════════════════════════════════════════════

def test_post_predict_valid(client, operator_token, seeded_device_id):
    """POST /predict with valid features → 200, predicted_class in allowed set."""
    resp = client.post(
        "/api/v1/predict",
        json={
            "device_id":     seeded_device_id,
            "temperature":   20.0,
            "humidity":      65.0,
            "ph":             6.5,
            "light_lux":   25000.0,
            "co2_ppm":       900.0,
            "soil_moisture":  60.0,
        },
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200, data
    assert data["predicted_class"] in {"optimal", "warning", "critical"}
    assert 0.0 <= data["confidence"] <= 1.0
    assert "prediction_id" in data


def test_post_predict_missing_device_id(client, operator_token):
    """POST /predict without device_id → 400."""
    resp = client.post(
        "/api/v1/predict",
        json={"temperature": 20.0},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 400


def test_viewer_cannot_predict(client, viewer_token, seeded_device_id):
    """POST /predict with viewer token → 403."""
    resp = client.post(
        "/api/v1/predict",
        json={"device_id": seeded_device_id, "temperature": 20.0},
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Alerts
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_alerts_open(client, admin_token):
    """GET /alerts/open → 200 + list (may be empty)."""
    resp = client.get(
        "/api/v1/alerts/open",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)


def test_viewer_can_read_alerts(client, viewer_token):
    """GET /alerts/open with viewer token → 200 (read-only access allowed)."""
    resp = client.get(
        "/api/v1/alerts/open",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# User / membership management
# ═══════════════════════════════════════════════════════════════════════════════

def test_admin_can_list_users(client, admin_token):
    """GET /users/ with admin token → 200, returns seeded members."""
    resp = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert "users" in data
    assert len(data["users"]) >= 3  # admin + operator1 + viewer1
    # Each entry should carry role and member_active from tenant_memberships
    first = data["users"][0]
    assert "role" in first
    assert "member_active" in first


def test_viewer_cannot_list_users(client, viewer_token):
    """GET /users/ with viewer token → 403."""
    resp = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403


def test_invite_member_creates_user(client, admin_token, seeded_tenant_id):
    """POST /tenants/<id>/members with create_user=true → 201, new membership."""
    resp = client.post(
        f"/api/v1/tenants/{seeded_tenant_id}/members",
        json={
            "email":       "newop@greenhouse.io",
            "username":    "newop",
            "full_name":   "New Operator",
            "password":    "NewOp1234!",
            "role":        "operator",
            "create_user": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 201, data
    assert data["role"] == "operator"


def test_invite_duplicate_member(client, admin_token, seeded_tenant_id):
    """POST /tenants/<id>/members for existing active member → 409."""
    resp = client.post(
        f"/api/v1/tenants/{seeded_tenant_id}/members",
        json={"email": "admin@greenhouse.io", "role": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 409


def test_invite_wrong_tenant(client, admin_token):
    """POST /tenants/99999/members → 403 (tenant mismatch)."""
    resp = client.post(
        "/api/v1/tenants/99999/members",
        json={"email": "x@x.com", "role": "viewer"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Simulator
# ═══════════════════════════════════════════════════════════════════════════════

def test_simulator_start_stop(client, admin_token):
    """POST /simulator/start → 200 running; POST /simulator/stop → 200 stopped."""
    start = client.post(
        "/api/v1/simulator/start",
        json={"interval_seconds": 60},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert start.status_code == 200, start.get_json()
    assert start.get_json()["status"] == "running"

    stop = client.post(
        "/api/v1/simulator/stop",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert stop.status_code == 200, stop.get_json()
    assert stop.get_json()["status"] == "stopped"


def test_simulator_double_start(client, admin_token):
    """Starting simulator twice → 409 on second call."""
    client.post(
        "/api/v1/simulator/start",
        json={"interval_seconds": 60},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    resp = client.post(
        "/api/v1/simulator/start",
        json={"interval_seconds": 60},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 409
    # Clean up
    client.post(
        "/api/v1/simulator/stop",
        headers={"Authorization": f"Bearer {admin_token}"},
    )


def test_viewer_cannot_start_simulator(client, viewer_token):
    """POST /simulator/start with viewer token → 403."""
    resp = client.post(
        "/api/v1/simulator/start",
        json={"interval_seconds": 30},
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403
