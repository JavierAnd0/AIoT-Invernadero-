"""
Seed script — inserts a full demo dataset covering every table in the system.

Safe to run multiple times: bails out immediately if users already exist.
Called automatically on container startup via CMD in Dockerfile.

Coverage
--------
  Tenant              1  (GreenCore Farms)
  Users               5  (admin, 2 operators, 2 viewers)
  TenantMemberships   5  (one per user, tenant-scoped roles)
  Zones               4  (Leafy Greens, Tomatoes, Herbs, Seedlings)
  Devices             7  (sensor_node + simulated, mixed statuses)
  CropTypes           8  (Lettuce, Tomato, Basil, Spinach, Strawberry, Mint,
                          Bell Pepper, Cucumber)
  Crops               8  (all statuses: germinating, growing, flowering,
                          harvested ×2, failed)
  SensorReadings   ~2 016 (7 devices × 24 h × 12 readings/day over 12 days)
  Alerts             18  (open, acknowledged, resolved — multiple severities)
  Predictions        24  (optimal, warning, critical — linked to readings)
"""

import math
import random
from datetime import date, datetime, timedelta

# ── reproducible data ─────────────────────────────────────────────────────────
random.seed(42)


# ── helpers ───────────────────────────────────────────────────────────────────

def _ago(days: float = 0, hours: float = 0) -> datetime:
    return datetime.utcnow() - timedelta(days=days, hours=hours)


def _date_ago(days: int) -> date:
    return (datetime.utcnow() - timedelta(days=days)).date()


def _sinusoidal(base: float, amplitude: float, hour: int, phase: float = 0.0) -> float:
    """Smooth daily cycle peaking around hour 14 (2 pm)."""
    angle = math.pi * 2 * (hour - phase) / 24
    return round(base + amplitude * math.sin(angle), 2)


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


# ── main entry point ──────────────────────────────────────────────────────────

def run_seed():
    """Populate the database with demo data for all system entities."""

    from models import db
    from models.alert import Alert
    from models.crop import Crop
    from models.crop_type import CropType
    from models.device import Device
    from models.prediction import Prediction
    from models.sensor_reading import SensorReading
    from models.tenant import Tenant
    from models.tenant_membership import TenantMembership
    from models.user import User
    from models.zone import Zone

    if User.query.count() > 0:
        print("Database already seeded — skipping.")
        return

    print("Seeding database …")

    # ══════════════════════════════════════════════════════════════════════════
    # 1. TENANT
    # ══════════════════════════════════════════════════════════════════════════
    tenant = Tenant(
        name="GreenCore Farms",
        slug="greencore-farms",
        is_active=True,
        created_at=_ago(days=90),
    )
    db.session.add(tenant)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 2. USERS  (no `role` column — roles live in tenant_memberships)
    # ══════════════════════════════════════════════════════════════════════════
    def _user(username, email, full_name, password="GreenCore2025!"):
        u = User(
            username=username,
            email=email,
            full_name=full_name,
            auth_provider="local",
            is_active=True,
            created_at=_ago(days=85),
        )
        u.set_password(password)
        return u

    admin    = _user("admin",     "admin@greencorefarms.io",    "System Administrator")
    operator1 = _user("carlos_m", "carlos@greencorefarms.io",  "Carlos Méndez")
    operator2 = _user("sofia_r",  "sofia@greencorefarms.io",   "Sofía Reyes")
    viewer1   = _user("ana_g",    "ana@greencorefarms.io",     "Ana Gómez")
    viewer2   = _user("luis_p",   "luis@greencorefarms.io",    "Luis Paredes")

    all_users = [admin, operator1, operator2, viewer1, viewer2]
    db.session.add_all(all_users)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 3. TENANT MEMBERSHIPS
    # ══════════════════════════════════════════════════════════════════════════
    memberships = [
        TenantMembership(tenant_id=tenant.tenant_id, user_id=admin.user_id,     role="admin",    is_active=True),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=operator1.user_id, role="operator", is_active=True),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=operator2.user_id, role="operator", is_active=True),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=viewer1.user_id,   role="viewer",   is_active=True),
        TenantMembership(tenant_id=tenant.tenant_id, user_id=viewer2.user_id,   role="viewer",   is_active=False),  # deactivated
    ]
    db.session.add_all(memberships)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 4. ZONES
    # ══════════════════════════════════════════════════════════════════════════
    zones = [
        Zone(tenant_id=tenant.tenant_id, name="Zone A - Leafy Greens",
             description="North section — lettuce, spinach and arugula",  area_m2=48.0),
        Zone(tenant_id=tenant.tenant_id, name="Zone B - Tomatoes",
             description="Central section with trellis and drip irrigation", area_m2=60.0),
        Zone(tenant_id=tenant.tenant_id, name="Zone C - Herbs",
             description="South section for aromatic and culinary herbs",  area_m2=24.0),
        Zone(tenant_id=tenant.tenant_id, name="Zone D - Seedlings",
             description="Climate-controlled nursery for germination",      area_m2=15.0),
    ]
    db.session.add_all(zones)
    db.session.flush()
    za, zb, zc, zd = zones

    # ══════════════════════════════════════════════════════════════════════════
    # 5. DEVICES
    # ══════════════════════════════════════════════════════════════════════════
    def _dev(zone, name, serial, status="online", firmware="v2.4.1"):
        return Device(
            tenant_id=tenant.tenant_id,
            zone_id=zone.zone_id,
            registered_by=admin.user_id,
            name=name,
            serial_number=serial,
            device_type="simulated",
            status=status,
            firmware_version=firmware,
            last_seen_at=_ago(hours=0.25) if status == "online" else _ago(hours=26),
        )

    devices = [
        _dev(za, "Sensor ZA-01",  "SIM-ZA-001"),                      # online
        _dev(za, "Sensor ZA-02",  "SIM-ZA-002"),                      # online
        _dev(zb, "Sensor ZB-01",  "SIM-ZB-001"),                      # online
        _dev(zb, "Sensor ZB-02",  "SIM-ZB-002", status="maintenance"), # maintenance
        _dev(zc, "Sensor ZC-01",  "SIM-ZC-001"),                      # online
        _dev(zd, "Sensor ZD-01",  "SIM-ZD-001"),                      # online
        _dev(zd, "Sensor ZD-02",  "SIM-ZD-002", status="offline"),    # offline
    ]
    db.session.add_all(devices)
    db.session.flush()
    dev_za1, dev_za2, dev_zb1, dev_zb2, dev_zc1, dev_zd1, dev_zd2 = devices

    # ══════════════════════════════════════════════════════════════════════════
    # 6. CROP TYPES
    # ══════════════════════════════════════════════════════════════════════════
    # (name, scientific, t_min, t_opt, t_max, h_min, h_max, ph_min, ph_max,
    #  light_min, light_max, growth_days)
    ct_data = [
        ("Lettuce",     "Lactuca sativa",          15, 20, 24, 50, 80, 6.0, 7.0,  10000,  40000,  45),
        ("Tomato",      "Solanum lycopersicum",     18, 24, 30, 60, 80, 5.5, 7.0,  25000,  80000,  90),
        ("Basil",       "Ocimum basilicum",         20, 28, 35, 40, 70, 5.5, 7.5,  20000,  60000,  30),
        ("Spinach",     "Spinacia oleracea",        10, 16, 22, 50, 75, 6.0, 7.5,   8000,  30000,  40),
        ("Strawberry",  "Fragaria × ananassa",      15, 21, 26, 65, 85, 5.5, 6.5,  15000,  50000, 120),
        ("Mint",        "Mentha spicata",           15, 22, 30, 55, 80, 6.0, 7.0,  12000,  40000,  60),
        ("Bell Pepper", "Capsicum annuum",          20, 26, 32, 60, 85, 6.0, 7.0,  25000,  70000, 100),
        ("Cucumber",    "Cucumis sativus",          18, 24, 32, 70, 90, 5.5, 7.0,  20000,  60000,  55),
    ]
    crop_types = [
        CropType(
            name=n, scientific_name=s,
            temp_min=tmn, temp_optimal=top, temp_max=tmx,
            humidity_min=hmn, humidity_max=hmx,
            ph_min=pmn, ph_max=pmx,
            light_min_lux=lmn, light_max_lux=lmx,
            growth_days=gd,
        )
        for n, s, tmn, top, tmx, hmn, hmx, pmn, pmx, lmn, lmx, gd in ct_data
    ]
    db.session.add_all(crop_types)
    db.session.flush()
    ct_lettuce, ct_tomato, ct_basil, ct_spinach, ct_strawberry, ct_mint, ct_pepper, ct_cucumber = crop_types

    # ══════════════════════════════════════════════════════════════════════════
    # 7. CROPS  (various statuses)
    # ══════════════════════════════════════════════════════════════════════════
    crops = [
        # Zone A — active batches
        Crop(tenant_id=tenant.tenant_id, zone_id=za.zone_id,
             crop_type_id=ct_lettuce.crop_type_id, created_by=operator1.user_id,
             batch_code="LET-A-001", quantity=300, status="growing",
             planted_at=_date_ago(25),
             expected_harvest_at=_date_ago(25) + timedelta(days=ct_lettuce.growth_days),
             notes="Second cycle of the season, drip irrigation active"),
        Crop(tenant_id=tenant.tenant_id, zone_id=za.zone_id,
             crop_type_id=ct_spinach.crop_type_id, created_by=operator1.user_id,
             batch_code="SPI-A-001", quantity=200, status="germinating",
             planted_at=_date_ago(5),
             expected_harvest_at=_date_ago(5) + timedelta(days=ct_spinach.growth_days)),
        # Zone B — tomatoes + peppers
        Crop(tenant_id=tenant.tenant_id, zone_id=zb.zone_id,
             crop_type_id=ct_tomato.crop_type_id, created_by=operator1.user_id,
             batch_code="TOM-B-001", quantity=120, status="flowering",
             planted_at=_date_ago(60),
             expected_harvest_at=_date_ago(60) + timedelta(days=ct_tomato.growth_days),
             notes="Cherry variety, first trusses appearing"),
        Crop(tenant_id=tenant.tenant_id, zone_id=zb.zone_id,
             crop_type_id=ct_pepper.crop_type_id, created_by=operator2.user_id,
             batch_code="PEP-B-001", quantity=80, status="growing",
             planted_at=_date_ago(40),
             expected_harvest_at=_date_ago(40) + timedelta(days=ct_pepper.growth_days)),
        # Zone C — herbs
        Crop(tenant_id=tenant.tenant_id, zone_id=zc.zone_id,
             crop_type_id=ct_basil.crop_type_id, created_by=operator2.user_id,
             batch_code="BAS-C-001", quantity=150, status="growing",
             planted_at=_date_ago(18),
             expected_harvest_at=_date_ago(18) + timedelta(days=ct_basil.growth_days)),
        Crop(tenant_id=tenant.tenant_id, zone_id=zc.zone_id,
             crop_type_id=ct_mint.crop_type_id, created_by=operator2.user_id,
             batch_code="MIN-C-001", quantity=100, status="harvested",
             planted_at=_date_ago(75),
             expected_harvest_at=_date_ago(75) + timedelta(days=ct_mint.growth_days),
             actual_harvest_at=_date_ago(8),
             notes="Excellent yield — 18 kg fresh weight"),
        # Zone D — seedlings
        Crop(tenant_id=tenant.tenant_id, zone_id=zd.zone_id,
             crop_type_id=ct_cucumber.crop_type_id, created_by=admin.user_id,
             batch_code="CUC-D-001", quantity=400, status="germinating",
             planted_at=_date_ago(3),
             expected_harvest_at=_date_ago(3) + timedelta(days=ct_cucumber.growth_days)),
        Crop(tenant_id=tenant.tenant_id, zone_id=zd.zone_id,
             crop_type_id=ct_strawberry.crop_type_id, created_by=operator1.user_id,
             batch_code="STR-D-001", quantity=60, status="failed",
             planted_at=_date_ago(50),
             expected_harvest_at=_date_ago(50) + timedelta(days=ct_strawberry.growth_days),
             notes="Fungal infection detected on day 22, batch discarded"),
    ]
    db.session.add_all(crops)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 8. SENSOR READINGS  — 12 days × 2 readings/hour × 24 h = 576 per device
    #    Active devices: za1, za2, zb1, zc1, zd1  →  ~2 880 rows total
    # ══════════════════════════════════════════════════════════════════════════

    # Per-zone baseline sensor profiles
    #   keys: temp_base, temp_amp, hum_base, hum_amp, ph, light_peak, co2_base, soil_base
    profiles = {
        dev_za1.device_id: dict(temp_base=20.0, temp_amp=4.0, hum_base=70.0, hum_amp=8.0,
                                ph=6.5,  light_peak=35000, co2_base=1100, soil_base=65.0),
        dev_za2.device_id: dict(temp_base=20.5, temp_amp=3.5, hum_base=68.0, hum_amp=7.0,
                                ph=6.4,  light_peak=33000, co2_base=1050, soil_base=62.0),
        dev_zb1.device_id: dict(temp_base=24.0, temp_amp=5.0, hum_base=72.0, hum_amp=6.0,
                                ph=6.2,  light_peak=55000, co2_base=1200, soil_base=70.0),
        dev_zc1.device_id: dict(temp_base=26.0, temp_amp=4.5, hum_base=60.0, hum_amp=5.0,
                                ph=6.8,  light_peak=40000, co2_base=950,  soil_base=55.0),
        dev_zd1.device_id: dict(temp_base=22.0, temp_amp=2.0, hum_base=75.0, hum_amp=4.0,
                                ph=6.6,  light_peak=20000, co2_base=1300, soil_base=72.0),
    }

    DAYS = 12
    READINGS_PER_HOUR = 2   # every 30 min
    all_readings: list[SensorReading] = []

    # We'll track "special" readings to attach alerts/predictions later
    anomaly_readings: list[SensorReading] = []   # high-temp / low-humidity readings
    normal_readings:  list[SensorReading] = []   # good conditions for predictions

    for device_id, p in profiles.items():
        for day_offset in range(DAYS, 0, -1):   # oldest first
            for hour in range(24):
                for minute in [0, 30]:
                    ts = _ago(days=day_offset) + timedelta(hours=hour, minutes=minute)

                    # Daylight: sun up 6–20 h
                    is_day   = 6 <= hour < 20
                    light_h  = max(0.0, math.sin(math.pi * (hour - 6) / 14)) if is_day else 0.0
                    light    = round(p["light_peak"] * light_h + random.uniform(-500, 500))
                    light    = max(0, light)

                    temp  = _sinusoidal(p["temp_base"], p["temp_amp"], hour, phase=2.0)
                    temp  = round(temp + random.uniform(-0.5, 0.5), 2)

                    hum   = _sinusoidal(p["hum_base"], -p["hum_amp"], hour, phase=2.0)
                    hum   = round(_clamp(hum + random.uniform(-1.5, 1.5), 30.0, 100.0), 2)

                    ph    = round(p["ph"] + random.uniform(-0.15, 0.15), 2)
                    ph    = round(_clamp(ph, 4.0, 9.0), 2)

                    co2   = round(p["co2_base"] + random.uniform(-80, 120))
                    co2   = max(300, co2)

                    soil  = round(p["soil_base"] + random.uniform(-3.0, 3.0), 2)
                    soil  = round(_clamp(soil, 0.0, 100.0), 2)

                    r = SensorReading(
                        tenant_id=tenant.tenant_id,
                        device_id=device_id,
                        temperature=temp,
                        humidity=hum,
                        ph=ph,
                        light_lux=light,
                        co2_ppm=co2,
                        soil_moisture=soil,
                        recorded_at=ts,
                        is_simulated=True,
                    )
                    all_readings.append(r)

                    # Tag readings for later use
                    if temp > (p["temp_base"] + p["temp_amp"] * 0.8):
                        anomaly_readings.append(r)
                    elif abs(temp - p["temp_base"]) < 1.0 and 55 < hum < 75:
                        normal_readings.append(r)

    db.session.add_all(all_readings)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 9. ALERTS  (18 alerts, mixed status / severity)
    # ══════════════════════════════════════════════════════════════════════════

    def _alert(device, reading, alert_type, severity, message,
               measured, threshold, status="open",
               assigned_to=None, resolved_at=None,
               created_at=None):
        return Alert(
            tenant_id=tenant.tenant_id,
            device_id=device.device_id,
            reading_id=reading.reading_id if reading else None,
            alert_type=alert_type,
            severity=severity,
            message=message,
            measured_value=measured,
            threshold_value=threshold,
            status=status,
            assigned_to=assigned_to,
            resolved_at=resolved_at,
            created_at=created_at or _ago(days=random.randint(1, 8)),
        )

    # Pick stable sample readings for alert linkage
    r_hot   = anomaly_readings[::50][:6]   # 6 high-temp readings, spread out
    r_norm  = normal_readings[::80][:5]    # 5 normal readings

    alerts = []

    # --- High temperature alerts (Zone B is warmest) ---
    for i, r in enumerate(r_hot[:3]):
        sev = ["high", "critical", "high"][i]
        sta = ["open", "acknowledged", "resolved"][i]
        res_at = _ago(days=i) if sta == "resolved" else None
        ass_to = operator1.user_id if sta != "open" else None
        alerts.append(_alert(
            dev_zb1, r, "temperature", sev,
            f"Temperature exceeded threshold: {float(r.temperature):.1f}°C (limit 30°C)",
            float(r.temperature), 30.0,
            status=sta, assigned_to=ass_to, resolved_at=res_at,
            created_at=r.recorded_at + timedelta(minutes=2),
        ))

    # --- Low humidity alerts (Zone C herbs need moisture) ---
    alerts.append(_alert(
        dev_zc1, r_hot[3], "humidity", "medium",
        "Humidity dropped below minimum: 42% (minimum 55%)",
        42.0, 55.0, status="open",
        created_at=_ago(days=2),
    ))
    alerts.append(_alert(
        dev_zc1, r_hot[4], "humidity", "high",
        "Sustained low humidity in Zone C — plant stress risk",
        38.5, 55.0, status="acknowledged",
        assigned_to=operator2.user_id,
        created_at=_ago(days=4),
    ))

    # --- pH alerts ---
    alerts.append(_alert(
        dev_za1, r_norm[0], "ph", "medium",
        "pH below optimal range: 5.7 (range 6.0–7.0) — check nutrient solution",
        5.7, 6.0, status="resolved",
        assigned_to=operator1.user_id, resolved_at=_ago(days=6),
        created_at=_ago(days=7),
    ))
    alerts.append(_alert(
        dev_zb1, r_norm[1], "ph", "low",
        "pH slightly elevated: 7.3 — minor adjustment recommended",
        7.3, 7.0, status="dismissed",
        created_at=_ago(days=3),
    ))

    # --- CO2 alerts ---
    alerts.append(_alert(
        dev_zd1, r_norm[2], "co2", "medium",
        "CO₂ concentration high: 1 620 ppm — increase ventilation",
        1620.0, 1500.0, status="open",
        created_at=_ago(days=1),
    ))
    alerts.append(_alert(
        dev_za2, r_norm[3], "co2", "low",
        "CO₂ below photosynthesis optimum: 650 ppm",
        650.0, 800.0, status="resolved",
        assigned_to=operator2.user_id, resolved_at=_ago(days=5),
        created_at=_ago(days=6),
    ))

    # --- Soil moisture alerts ---
    alerts.append(_alert(
        dev_zb1, r_hot[5], "soil_moisture", "high",
        "Soil moisture critically low: 28% — irrigation required immediately",
        28.0, 40.0, status="acknowledged",
        assigned_to=operator1.user_id,
        created_at=_ago(days=1, hours=3),
    ))
    alerts.append(_alert(
        dev_za1, r_norm[4], "soil_moisture", "medium",
        "Soil moisture below optimal: 35% (target 60–80%)",
        35.0, 40.0, status="resolved",
        assigned_to=operator2.user_id, resolved_at=_ago(days=9),
        created_at=_ago(days=10),
    ))

    # --- Device offline alerts ---
    alerts.append(_alert(
        dev_zd2, None, "device_offline", "high",
        "Device SIM-ZD-002 has not reported readings for 26 hours",
        None, None, status="acknowledged",
        assigned_to=admin.user_id,
        created_at=_ago(hours=26),
    ))
    alerts.append(_alert(
        dev_zb2, None, "device_offline", "medium",
        "Device SIM-ZB-002 put in maintenance mode — scheduled firmware update",
        None, None, status="resolved",
        assigned_to=admin.user_id, resolved_at=_ago(hours=2),
        created_at=_ago(hours=5),
    ))

    # --- Prediction-based alerts ---
    alerts.append(_alert(
        dev_zb1, r_hot[0], "prediction", "critical",
        "AI model predicted CRITICAL conditions — immediate intervention required",
        None, None, status="open",
        created_at=r_hot[0].recorded_at + timedelta(minutes=1),
    ))
    alerts.append(_alert(
        dev_zc1, r_hot[1], "prediction", "high",
        "AI model predicted WARNING conditions in Zone C herb section",
        None, None, status="acknowledged",
        assigned_to=operator2.user_id,
        created_at=r_hot[1].recorded_at + timedelta(minutes=1),
    ))

    # --- Light alerts ---
    alerts.append(_alert(
        dev_za2, r_norm[0], "light", "low",
        "Light intensity below crop minimum: 7 200 lux (minimum 10 000 lux)",
        7200.0, 10000.0, status="dismissed",
        created_at=_ago(days=3, hours=6),
    ))

    # --- Extra resolved alerts for history depth ---
    for i in range(3):
        alerts.append(_alert(
            [dev_za1, dev_zb1, dev_zc1][i], r_norm[i % len(r_norm)],
            ["temperature", "humidity", "co2"][i],
            "medium",
            [
                "Temperature briefly exceeded 28°C during afternoon peak",
                "Humidity dropped to 52% — misting cycle triggered",
                "CO₂ spike to 1 480 ppm after manual CO₂ injection",
            ][i],
            [28.5, 52.0, 1480.0][i],
            [27.0, 55.0, 1400.0][i],
            status="resolved",
            assigned_to=[operator1, operator2, operator1][i].user_id,
            resolved_at=_ago(days=10 + i),
            created_at=_ago(days=11 + i),
        ))

    db.session.add_all(alerts)
    db.session.flush()

    # ══════════════════════════════════════════════════════════════════════════
    # 10. PREDICTIONS  (24 — optimal, warning, critical mix)
    # ══════════════════════════════════════════════════════════════════════════

    prediction_scenarios = [
        # (device, reading_idx, class, confidence, probs, model)
        # ---- Optimal conditions ----
        (dev_za1, 0,  "optimal",  0.9312, {"optimal": 0.9312, "warning": 0.0521, "critical": 0.0167}, "random_forest"),
        (dev_za1, 4,  "optimal",  0.8876, {"optimal": 0.8876, "warning": 0.0894, "critical": 0.0230}, "random_forest"),
        (dev_za2, 0,  "optimal",  0.9105, {"optimal": 0.9105, "warning": 0.0660, "critical": 0.0235}, "gradient_boost"),
        (dev_za2, 6,  "optimal",  0.8734, {"optimal": 0.8734, "warning": 0.1012, "critical": 0.0254}, "random_forest"),
        (dev_zb1, 2,  "optimal",  0.8420, {"optimal": 0.8420, "warning": 0.1180, "critical": 0.0400}, "random_forest"),
        (dev_zc1, 0,  "optimal",  0.9001, {"optimal": 0.9001, "warning": 0.0750, "critical": 0.0249}, "gradient_boost"),
        (dev_zd1, 1,  "optimal",  0.8660, {"optimal": 0.8660, "warning": 0.0990, "critical": 0.0350}, "random_forest"),
        (dev_zd1, 5,  "optimal",  0.9220, {"optimal": 0.9220, "warning": 0.0580, "critical": 0.0200}, "random_forest"),
        # ---- Warning conditions ----
        (dev_zb1, 10, "warning",  0.7543, {"optimal": 0.1820, "warning": 0.7543, "critical": 0.0637}, "random_forest"),
        (dev_zb1, 14, "warning",  0.8102, {"optimal": 0.1050, "warning": 0.8102, "critical": 0.0848}, "gradient_boost"),
        (dev_za1, 8,  "warning",  0.6890, {"optimal": 0.2340, "warning": 0.6890, "critical": 0.0770}, "random_forest"),
        (dev_zc1, 4,  "warning",  0.7220, {"optimal": 0.1980, "warning": 0.7220, "critical": 0.0800}, "random_forest"),
        (dev_za2, 12, "warning",  0.6640, {"optimal": 0.2560, "warning": 0.6640, "critical": 0.0800}, "gradient_boost"),
        (dev_zd1, 9,  "warning",  0.7890, {"optimal": 0.1450, "warning": 0.7890, "critical": 0.0660}, "random_forest"),
        (dev_zb1, 20, "warning",  0.7100, {"optimal": 0.1920, "warning": 0.7100, "critical": 0.0980}, "random_forest"),
        (dev_zc1, 8,  "warning",  0.6450, {"optimal": 0.2750, "warning": 0.6450, "critical": 0.0800}, "gradient_boost"),
        # ---- Critical conditions ----
        (dev_zb1, 18, "critical", 0.8910, {"optimal": 0.0340, "warning": 0.0750, "critical": 0.8910}, "random_forest"),
        (dev_zb1, 22, "critical", 0.7650, {"optimal": 0.0820, "warning": 0.1530, "critical": 0.7650}, "gradient_boost"),
        (dev_zc1, 16, "critical", 0.8230, {"optimal": 0.0510, "warning": 0.1260, "critical": 0.8230}, "random_forest"),
        (dev_za1, 20, "critical", 0.7440, {"optimal": 0.0990, "warning": 0.1570, "critical": 0.7440}, "gradient_boost"),
        (dev_zd1, 15, "critical", 0.8080, {"optimal": 0.0620, "warning": 0.1300, "critical": 0.8080}, "random_forest"),
        (dev_za2, 18, "critical", 0.7760, {"optimal": 0.0780, "warning": 0.1460, "critical": 0.7760}, "random_forest"),
        (dev_zb1, 30, "critical", 0.8550, {"optimal": 0.0400, "warning": 0.1050, "critical": 0.8550}, "gradient_boost"),
        (dev_zc1, 24, "critical", 0.7200, {"optimal": 0.1100, "warning": 0.1700, "critical": 0.7200}, "random_forest"),
    ]

    # Collect readings indexed per device for linking
    readings_by_device: dict[int, list[SensorReading]] = {}
    for r in all_readings:
        readings_by_device.setdefault(r.device_id, []).append(r)

    pred_objects = []
    for dev, r_idx, cls, conf, probs, model in prediction_scenarios:
        dev_readings = readings_by_device.get(dev.device_id, [])
        if r_idx >= len(dev_readings):
            continue
        r = dev_readings[r_idx]
        pred_objects.append(Prediction(
            tenant_id=tenant.tenant_id,
            device_id=dev.device_id,
            reading_id=r.reading_id,
            model_name=model,
            model_version="1.0.0",
            predicted_class=cls,
            confidence=round(conf, 4),
            raw_probabilities=probs,
            input_features={
                "temperature":   float(r.temperature)   if r.temperature   is not None else None,
                "humidity":      float(r.humidity)      if r.humidity      is not None else None,
                "ph":            float(r.ph)            if r.ph            is not None else None,
                "light_lux":     float(r.light_lux)     if r.light_lux     is not None else None,
                "co2_ppm":       float(r.co2_ppm)       if r.co2_ppm       is not None else None,
                "soil_moisture": float(r.soil_moisture) if r.soil_moisture is not None else None,
            },
            created_at=r.recorded_at + timedelta(seconds=random.randint(2, 15)),
        ))

    db.session.add_all(pred_objects)
    db.session.commit()

    # ── Summary ───────────────────────────────────────────────────────────────
    print(
        f"✓ Seed complete:\n"
        f"  1 tenant   · {len(all_users)} users   · {len(memberships)} memberships\n"
        f"  {len(zones)} zones    · {len(devices)} devices  · {len(crop_types)} crop types\n"
        f"  {len(crops)} crops    · {len(all_readings):,} readings · {len(alerts)} alerts\n"
        f"  {len(pred_objects)} predictions\n"
        f"\n"
        f"  Admin login → username: admin  password: GreenCore2025!"
    )
