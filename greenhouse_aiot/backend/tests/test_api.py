"""Integration tests for the AIoT Greenhouse REST API.

15 tests covering authentication, CRUD operations, alerts,
predictions, and the IoT simulator.
"""

import pytest


# ── Auth ──────────────────────────────────────────────────────────────────────

def test_login_valid_credentials(client):
    """POST /auth/login with correct admin credentials → 200 + token."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin1234!"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert "token" in data
    assert data["token"]  # non-empty


def test_login_invalid_password(client):
    """POST /auth/login with wrong password → 401."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_me_authenticated(client, admin_token):
    """GET /auth/me with valid token → 200 and role=admin."""
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert data["role"] == "admin"


# ── Zones ─────────────────────────────────────────────────────────────────────

def test_get_zones_authenticated(client, admin_token):
    """GET /zones with valid token → 200 + non-empty list."""
    resp = client.get(
        "/api/v1/zones/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_zones_unauthenticated(client):
    """GET /zones without token → 401."""
    resp = client.get("/api/v1/zones/")
    assert resp.status_code == 401


def test_create_zone(client, admin_token):
    """POST /zones with admin token → 201 + zone_id in body."""
    resp = client.post(
        "/api/v1/zones/",
        json={"name": "Zone Test - Pytest", "description": "Created by test", "area_m2": 12.5},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 201
    assert "zone_id" in data
    assert data["name"] == "Zone Test - Pytest"


# ── Devices ───────────────────────────────────────────────────────────────────

def test_get_devices(client, admin_token):
    """GET /devices with valid token → 200 + list."""
    resp = client.get(
        "/api/v1/devices/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


# ── Readings ──────────────────────────────────────────────────────────────────

def test_post_reading_valid(client, operator_token):
    """POST /readings with valid payload → 201 + reading + alerts_created + prediction."""
    resp = client.post(
        "/api/v1/readings/",
        json={
            "device_id":    1,
            "temperature":  21.5,
            "humidity":     68.0,
            "ph":            6.4,
            "light_lux":  22000.0,
            "co2_ppm":      420.0,
            "soil_moisture": 65.0,
            "is_simulated": False,
        },
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 201, data
    assert "reading" in data
    assert "alerts_created" in data
    assert "prediction" in data
    assert data["reading"]["device_id"] == 1


def test_post_reading_out_of_range(client, operator_token):
    """POST /readings with temperature=999 (> 60 max) → 400."""
    resp = client.post(
        "/api/v1/readings/",
        json={"device_id": 1, "temperature": 999.0},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 400


def test_readings_latest(client, admin_token):
    """GET /readings/latest → 200 + array of {device, reading} pairs."""
    resp = client.get(
        "/api/v1/readings/latest",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)


# ── Predictions ───────────────────────────────────────────────────────────────

def test_post_predict_valid(client, operator_token):
    """POST /predict with valid features → 200 + predicted_class in valid set."""
    resp = client.post(
        "/api/v1/predict",
        json={
            "device_id":    1,
            "temperature":  20.0,
            "humidity":     65.0,
            "ph":            6.5,
            "light_lux":  25000.0,
            "co2_ppm":      900.0,
            "soil_moisture": 60.0,
        },
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200, data
    assert data["predicted_class"] in {"optimal", "warning", "critical"}
    assert 0.0 <= data["confidence"] <= 1.0


def test_post_predict_missing_features(client, operator_token):
    """POST /predict with empty body → 400."""
    resp = client.post(
        "/api/v1/predict",
        json={},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert resp.status_code == 400


# ── Alerts ────────────────────────────────────────────────────────────────────

def test_get_alerts_open(client, admin_token):
    """GET /alerts/open → 200 + list."""
    resp = client.get(
        "/api/v1/alerts/open",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert isinstance(data, list)


# ── Role enforcement ──────────────────────────────────────────────────────────

def test_viewer_cannot_post_reading(client, viewer_token):
    """POST /readings with viewer token → 403 Forbidden."""
    resp = client.post(
        "/api/v1/readings/",
        json={
            "device_id":   1,
            "temperature": 22.0,
            "humidity":    65.0,
        },
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert resp.status_code == 403


# ── Simulator ─────────────────────────────────────────────────────────────────

def test_simulator_start_stop(client, admin_token):
    """POST /simulator/start → 200 running; POST /simulator/stop → 200 stopped."""
    start_resp = client.post(
        "/api/v1/simulator/start",
        json={"interval_seconds": 60},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    start_data = start_resp.get_json()
    assert start_resp.status_code == 200, start_data
    assert start_data["status"] == "running"

    stop_resp = client.post(
        "/api/v1/simulator/stop",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    stop_data = stop_resp.get_json()
    assert stop_resp.status_code == 200, stop_data
    assert stop_data["status"] == "stopped"
