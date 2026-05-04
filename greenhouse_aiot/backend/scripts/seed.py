"""
Seed script — inserts initial data if the database is empty.
Called automatically on container startup via CMD in Dockerfile.
"""


def run_seed():
    """Populate the database with initial users, zones, devices and crop types."""
    from models.user import User
    from models.zone import Zone
    from models.device import Device
    from models.crop_type import CropType
    from models import db

    if User.query.count() > 0:
        print("Database already seeded — skipping.")
        return

    # ── Users ─────────────────────────────────────────────────────────────────
    admin = User(username="admin", email="admin@greenhouse.io",
                 full_name="System Administrator", role="admin", is_active=True)
    admin.set_password("Admin1234!")

    operator = User(username="operator1", email="op1@greenhouse.io",
                    full_name="Carlos Mendez", role="operator", is_active=True)
    operator.set_password("Admin1234!")

    viewer = User(username="viewer1", email="viewer1@greenhouse.io",
                  full_name="Ana Gomez", role="viewer", is_active=True)
    viewer.set_password("Admin1234!")

    db.session.add_all([admin, operator, viewer])
    db.session.flush()

    # ── Zones ─────────────────────────────────────────────────────────────────
    zones = [
        Zone(name="Zone A - Leafy Greens",  description="North section for lettuce and spinach",  area_m2=48.0),
        Zone(name="Zone B - Tomatoes",      description="Central section with trellis support",    area_m2=60.0),
        Zone(name="Zone C - Herbs",         description="South section for herb production",       area_m2=24.0),
        Zone(name="Zone D - Seedlings",     description="Nursery for germination",                 area_m2=15.0),
    ]
    db.session.add_all(zones)
    db.session.flush()

    # ── Devices ───────────────────────────────────────────────────────────────
    devices_data = [
        (zones[0].zone_id, "Sensor Node ZA-01", "SIM-ZA-001"),
        (zones[0].zone_id, "Sensor Node ZA-02", "SIM-ZA-002"),
        (zones[1].zone_id, "Sensor Node ZB-01", "SIM-ZB-001"),
        (zones[2].zone_id, "Sensor Node ZC-01", "SIM-ZC-001"),
        (zones[3].zone_id, "Sensor Node ZD-01", "SIM-ZD-001"),
    ]
    devices = [
        Device(zone_id=z, registered_by=admin.user_id,
               name=n, serial_number=s, device_type="simulated", status="online")
        for z, n, s in devices_data
    ]
    db.session.add_all(devices)
    db.session.flush()

    # ── Crop types ────────────────────────────────────────────────────────────
    crop_types_data = [
        ("Lettuce",     "Lactuca sativa",          15, 20, 24, 50, 80, 6.0, 7.0, 10000,  40000,  45),
        ("Tomato",      "Solanum lycopersicum",     18, 24, 30, 60, 80, 5.5, 7.0, 25000,  80000,  90),
        ("Basil",       "Ocimum basilicum",         20, 28, 35, 40, 70, 5.5, 7.5, 20000,  60000,  30),
        ("Spinach",     "Spinacia oleracea",        10, 16, 22, 50, 75, 6.0, 7.5,  8000,  30000,  40),
        ("Strawberry",  "Fragaria x ananassa",      15, 21, 26, 65, 85, 5.5, 6.5, 15000,  50000, 120),
        ("Mint",        "Mentha spicata",           15, 22, 30, 55, 80, 6.0, 7.0, 12000,  40000,  60),
        ("Bell Pepper", "Capsicum annuum",          20, 26, 32, 60, 85, 6.0, 7.0, 25000,  70000, 100),
    ]
    crop_types = [
        CropType(name=n, scientific_name=s,
                 temp_min=mn, temp_optimal=op, temp_max=mx,
                 humidity_min=hmn, humidity_max=hmx,
                 ph_min=pmn, ph_max=pmx,
                 light_min_lux=lmn, light_max_lux=lmx,
                 growth_days=gd)
        for n, s, mn, op, mx, hmn, hmx, pmn, pmx, lmn, lmx, gd in crop_types_data
    ]
    db.session.add_all(crop_types)
    db.session.commit()

    print(f"Seed complete: {len([admin,operator,viewer])} users, "
          f"{len(zones)} zones, {len(devices)} devices, {len(crop_types)} crop types.")