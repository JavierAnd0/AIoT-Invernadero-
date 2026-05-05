"""Prediction service — bridge between the HTTP layer and the D4 AI module.

Handles field-name normalisation (frontend short names → D1 schema names)
and delegates inference to ``predict.py`` from D4.
"""

import logging
import os
import sys

logger = logging.getLogger(__name__)

# ── D4 AI module import ───────────────────────────────────────────────────────

_AI_MODULE_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "ai")
)

# Loaded lazily on first call so tests can patch _predict before import.
_predict = None


def _load_predict():
    """Import the predict function from D4 greenhouse_aiot/ai/predict.py."""
    global _predict
    if _AI_MODULE_PATH not in sys.path:
        sys.path.insert(0, _AI_MODULE_PATH)
    from predict import predict  # noqa: PLC0415
    _predict = predict
    return _predict


# ── Field-name mapping ────────────────────────────────────────────────────────

# Maps frontend (D3 screen-predict.jsx) short names → D1 schema full names.
FIELD_MAP: dict[str, str] = {
    "temp":  "temperature",
    "hum":   "humidity",
    "ph":    "ph",           # already the same — included for completeness
    "light": "light_lux",
    "co2":   "co2_ppm",
    "soil":  "soil_moisture",
}

FULL_FEATURE_NAMES: frozenset[str] = frozenset({
    "temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture",
})


def _normalize_features(raw_input: dict) -> dict:
    """Convert short frontend names to D1 schema names.

    Supports both short (temp, hum…) and full (temperature, humidity…) forms.
    Full names take precedence if both are supplied.
    """
    features: dict[str, float] = {}

    # First pass: map short names
    for short, full in FIELD_MAP.items():
        if short in raw_input and raw_input[short] is not None:
            features[full] = float(raw_input[short])

    # Second pass: full names override short names
    for full in FULL_FEATURE_NAMES:
        if full in raw_input and raw_input[full] is not None:
            features[full] = float(raw_input[full])

    return features


def run_prediction(raw_input: dict, model_name: str = "random_forest") -> dict:
    """Normalise feature names then call the D4 predict function.

    Args:
        raw_input:  Dict with sensor values in either short or full field names.
        model_name: One of logistic_regression, random_forest, svc, neural_network.

    Returns:
        Dict compatible with the `predictions` table schema (D1).

    Raises:
        RuntimeError: If the D4 AI module or model files are not available.
        ValueError:   If required features are missing after normalisation.
    """
    global _predict

    features = _normalize_features(raw_input)

    # Attempt lazy load of D4 predict function
    if _predict is None:
        try:
            _load_predict()
        except Exception as exc:
            raise RuntimeError(f"AI model unavailable: {exc}") from exc

    try:
        result = _predict(features, model_name=model_name)
    except FileNotFoundError as exc:
        raise RuntimeError(str(exc)) from exc

    return result
