"""
Synthetic dataset generator for greenhouse condition classification.
Generates 5000 samples × 7 crops = 35 000 rows with realistic Gaussian noise.

Usage:
    python dataset_generator.py
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── Crop thresholds (from D1 seed data) ──────────────────────────────────────
CROP_THRESHOLDS: dict[str, dict] = {
    "Lettuce":     {"temp": (15.0, 24.0), "humidity": (50.0, 80.0), "ph": (6.0, 7.0), "light_lux": (10000.0, 40000.0)},
    "Tomato":      {"temp": (18.0, 30.0), "humidity": (60.0, 80.0), "ph": (5.5, 7.0), "light_lux": (25000.0, 80000.0)},
    "Basil":       {"temp": (20.0, 35.0), "humidity": (40.0, 70.0), "ph": (5.5, 7.5), "light_lux": (20000.0, 60000.0)},
    "Spinach":     {"temp": (10.0, 22.0), "humidity": (50.0, 75.0), "ph": (6.0, 7.5), "light_lux": (8000.0, 30000.0)},
    "Strawberry":  {"temp": (15.0, 26.0), "humidity": (65.0, 85.0), "ph": (5.5, 6.5), "light_lux": (15000.0, 50000.0)},
    "Mint":        {"temp": (15.0, 30.0), "humidity": (55.0, 80.0), "ph": (6.0, 7.0), "light_lux": (12000.0, 40000.0)},
    "Bell Pepper": {"temp": (20.0, 32.0), "humidity": (60.0, 85.0), "ph": (6.0, 7.0), "light_lux": (25000.0, 70000.0)},
}

# General thresholds for features not crop-specific in D1
CO2_OPTIMAL   = (400.0,  1500.0)   # ppm — normal greenhouse enrichment
SOIL_OPTIMAL  = (40.0,   80.0)     # percent — substrate moisture

# Gaussian noise standard deviations (as specified)
NOISE_STD = {
    "temperature":   1.5,
    "humidity":      3.0,
    "ph":            0.2,
    "light_lux":   500.0,
    "co2_ppm":      20.0,
    "soil_moisture": 2.0,
}

# Physical sensor bounds (from D1 CHECK constraints)
PHYS_BOUNDS = {
    "temperature":   (-10.0, 60.0),
    "humidity":      (0.0,  100.0),
    "ph":            (0.0,   14.0),
    "light_lux":     (0.0, 150000.0),
    "co2_ppm":       (0.0,  5000.0),
    "soil_moisture": (0.0,  100.0),
}

FEATURE_COLS = ["temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture"]

SAMPLES_PER_CROP = 5000
N_OPTIMAL  = 2000
N_WARNING  = 1500
N_CRITICAL = 1500


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sample_warning(lo: float, hi: float) -> float:
    """Return a value in the warning zone: [lo*0.85, lo) or (hi, hi*1.15]."""
    if lo <= 0 or np.random.random() > 0.5:
        return np.random.uniform(hi, hi * 1.15)
    return np.random.uniform(lo * 0.85, lo)


def _sample_critical(lo: float, hi: float, phys_lo: float, phys_hi: float) -> float:
    """Return a value in the critical zone: <lo*0.85 or >hi*1.15."""
    if lo <= 0 or np.random.random() > 0.5:
        return np.random.uniform(hi * 1.15, min(hi * 1.5, phys_hi))
    return np.random.uniform(max(lo * 0.5, phys_lo), lo * 0.85)


def _label(row: dict, thresholds: dict) -> str:
    """Classify a row given crop-specific thresholds (after noise is applied)."""
    param_bounds = [
        ("temperature",   thresholds["temp"]),
        ("humidity",      thresholds["humidity"]),
        ("ph",            thresholds["ph"]),
        ("light_lux",     thresholds["light_lux"]),
        ("co2_ppm",       CO2_OPTIMAL),
        ("soil_moisture", SOIL_OPTIMAL),
    ]
    has_warning = False
    for feat, (lo, hi) in param_bounds:
        v = row[feat]
        if v < lo * 0.85 or v > hi * 1.15:
            return "critical"
        if v < lo or v > hi:
            has_warning = True
    return "warning" if has_warning else "optimal"


# ── Sample generation ─────────────────────────────────────────────────────────

def _generate_crop_samples(crop_name: str, thresholds: dict) -> list[dict]:
    t_lo, t_hi = thresholds["temp"]
    h_lo, h_hi = thresholds["humidity"]
    p_lo, p_hi = thresholds["ph"]
    l_lo, l_hi = thresholds["light_lux"]
    c_lo, c_hi = CO2_OPTIMAL
    s_lo, s_hi = SOIL_OPTIMAL

    param_ranges = [
        ("temperature",   t_lo, t_hi, *PHYS_BOUNDS["temperature"]),
        ("humidity",      h_lo, h_hi, *PHYS_BOUNDS["humidity"]),
        ("ph",            p_lo, p_hi, *PHYS_BOUNDS["ph"]),
        ("light_lux",     l_lo, l_hi, *PHYS_BOUNDS["light_lux"]),
        ("co2_ppm",       c_lo, c_hi, *PHYS_BOUNDS["co2_ppm"]),
        ("soil_moisture", s_lo, s_hi, *PHYS_BOUNDS["soil_moisture"]),
    ]

    def _base_optimal() -> dict:
        return {
            "temperature":   np.random.uniform(t_lo, t_hi),
            "humidity":      np.random.uniform(h_lo, h_hi),
            "ph":            np.random.uniform(p_lo, p_hi),
            "light_lux":     np.random.uniform(l_lo, l_hi),
            "co2_ppm":       np.random.uniform(c_lo, c_hi),
            "soil_moisture": np.random.uniform(s_lo, s_hi),
            "crop_type":     crop_name,
        }

    rows: list[dict] = []

    # Optimal class
    for _ in range(N_OPTIMAL):
        rows.append(_base_optimal())

    # Warning class — perturb 1 or 2 params into warning zone
    for _ in range(N_WARNING):
        row = _base_optimal()
        n_perturb = np.random.choice([1, 2])
        for idx in np.random.choice(len(param_ranges), n_perturb, replace=False):
            feat, lo, hi, phys_lo, phys_hi = param_ranges[idx]
            row[feat] = _sample_warning(lo, hi)
        rows.append(row)

    # Critical class — perturb 1 or 2 params into critical zone
    for _ in range(N_CRITICAL):
        row = _base_optimal()
        n_perturb = np.random.choice([1, 2])
        for idx in np.random.choice(len(param_ranges), n_perturb, replace=False):
            feat, lo, hi, phys_lo, phys_hi = param_ranges[idx]
            row[feat] = _sample_critical(lo, hi, phys_lo, phys_hi)
        rows.append(row)

    return rows


def _add_noise(df: pd.DataFrame) -> pd.DataFrame:
    """Add Gaussian noise to all sensor features and clip to physical bounds."""
    for feat, std in NOISE_STD.items():
        df[feat] += np.random.normal(0, std, len(df))
    for feat, (lo, hi) in PHYS_BOUNDS.items():
        df[feat] = df[feat].clip(lo, hi)
    return df


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    all_rows: list[dict] = []
    for crop_name, thresholds in CROP_THRESHOLDS.items():
        all_rows.extend(_generate_crop_samples(crop_name, thresholds))

    df = pd.DataFrame(all_rows)
    df = _add_noise(df)

    # Re-label based on actual (post-noise) values per crop
    conditions: list[str] = []
    for _, row in df.iterrows():
        crop = row["crop_type"]
        conditions.append(_label(row.to_dict(), CROP_THRESHOLDS[crop]))
    df["condition"] = conditions

    # Round to match DECIMAL precision from D1
    df["temperature"]   = df["temperature"].round(2)
    df["humidity"]      = df["humidity"].round(2)
    df["ph"]            = df["ph"].round(2)
    df["light_lux"]     = df["light_lux"].round(2)
    df["co2_ppm"]       = df["co2_ppm"].round(2)
    df["soil_moisture"] = df["soil_moisture"].round(2)

    out_path = DATA_DIR / "greenhouse_dataset.csv"
    df.to_csv(out_path, index=False)
    print(f"Dataset saved → {out_path}  ({len(df):,} rows)\n")

    # ── Class distribution ────────────────────────────────────────────────────
    print("=" * 60)
    print("CLASS DISTRIBUTION")
    print("=" * 60)
    dist = df["condition"].value_counts()
    for label, count in dist.items():
        pct = count / len(df) * 100
        print(f"  {label:<12}  {count:>6,}  ({pct:.1f}%)")

    print()
    print("CLASS DISTRIBUTION BY CROP")
    print("=" * 60)
    ct = df.groupby(["crop_type", "condition"]).size().unstack(fill_value=0)
    print(ct.to_string())

    # ── Descriptive statistics ────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("DESCRIPTIVE STATISTICS (sensor features)")
    print("=" * 60)
    print(df[FEATURE_COLS].describe().round(2).to_string())
    print()
    print("Done.")


if __name__ == "__main__":
    main()
