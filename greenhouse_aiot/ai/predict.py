"""
Inference module for greenhouse condition classification.
Loads pre-trained models and returns predictions compatible with the
`predictions` table schema defined in D1.

No model training happens here — run train_model.py first.

Usage:
    python predict.py                          # demo with example input
    from predict import predict                # import from other modules
"""

import warnings
import joblib
import numpy as np

from pathlib import Path
from functools import lru_cache

warnings.filterwarnings("ignore")

BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"

FEATURE_COLS = ["temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture"]

MODEL_VERSION = "1.0.0"

# Maps model_name → (file path, loader)
_SKLEARN_MODELS = {
    "logistic_regression": "logistic_regression_model.pkl",
    "random_forest":       "random_forest_model.pkl",
    "svc":                 "svc_model.pkl",
}
_KERAS_MODELS = {
    "neural_network": "neural_network_model.h5",
}


# ── Lazy-loaded artefacts ─────────────────────────────────────────────────────

@lru_cache(maxsize=None)
def _get_scaler():
    path = MODELS_DIR / "scaler.pkl"
    if not path.exists():
        raise FileNotFoundError(
            f"Scaler not found at {path}. Run train_model.py first."
        )
    return joblib.load(path)


@lru_cache(maxsize=None)
def _get_label_encoder():
    path = MODELS_DIR / "label_encoder.pkl"
    if not path.exists():
        raise FileNotFoundError(
            f"Label encoder not found at {path}. Run train_model.py first."
        )
    return joblib.load(path)


@lru_cache(maxsize=None)
def _get_sklearn_model(model_name: str):
    filename = _SKLEARN_MODELS[model_name]
    path = MODELS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found at {path}. Run train_model.py first."
        )
    return joblib.load(path)


@lru_cache(maxsize=None)
def _get_keras_model(model_name: str):
    import tensorflow as tf
    tf.get_logger().setLevel("ERROR")
    filename = _KERAS_MODELS[model_name]
    path = MODELS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Keras model not found at {path}. Run train_model.py first."
        )
    return tf.keras.models.load_model(str(path))


# ── Public API ────────────────────────────────────────────────────────────────

def predict(features: dict, model_name: str = "logistic_regression") -> dict:
    """
    Classify greenhouse sensor readings into optimal / warning / critical.

    Parameters
    ----------
    features : dict
        Sensor values with keys: temperature, humidity, ph,
        light_lux, co2_ppm, soil_moisture.
        Missing keys default to 0.0.
    model_name : str
        One of: "logistic_regression", "random_forest", "svc",
        "neural_network".  Defaults to "logistic_regression".

    Returns
    -------
    dict compatible with the `predictions` table in D1:
        predicted_class   : str   — "optimal" | "warning" | "critical"
        confidence        : float — highest class probability (0–1)
        raw_probabilities : dict  — {"optimal": p, "warning": p, "critical": p}
        model_name        : str   — model identifier used
        model_version     : str   — "1.0.0"
        input_features    : dict  — the features dict that was passed in
    """
    valid_names = set(_SKLEARN_MODELS) | set(_KERAS_MODELS)
    if model_name not in valid_names:
        raise ValueError(
            f"Unknown model '{model_name}'. Choose from: {sorted(valid_names)}"
        )

    # Build feature vector in the canonical order
    x = np.array([[features.get(f, 0.0) for f in FEATURE_COLS]], dtype=np.float64)

    scaler = _get_scaler()
    le     = _get_label_encoder()
    x_s    = scaler.transform(x)

    if model_name in _SKLEARN_MODELS:
        model      = _get_sklearn_model(model_name)
        proba      = model.predict_proba(x_s)[0]         # shape (n_classes,)
        pred_idx   = int(np.argmax(proba))
    else:
        model      = _get_keras_model(model_name)
        proba      = model.predict(x_s, verbose=0)[0]    # shape (n_classes,)
        pred_idx   = int(np.argmax(proba))

    predicted_class = le.inverse_transform([pred_idx])[0]
    confidence      = float(proba[pred_idx])

    # Map class index → class name for raw_probabilities
    raw_probabilities = {
        cls: round(float(proba[le.transform([cls])[0]]), 6)
        for cls in le.classes_
    }

    return {
        "predicted_class":   predicted_class,
        "confidence":        round(confidence, 4),
        "raw_probabilities": raw_probabilities,
        "model_name":        model_name,
        "model_version":     MODEL_VERSION,
        "input_features":    features,
    }


# ── Demo ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    examples = [
        {
            "label": "Lettuce — optimal conditions",
            "features": {
                "temperature":   20.0,
                "humidity":      65.0,
                "ph":            6.5,
                "light_lux":  25000.0,
                "co2_ppm":      900.0,
                "soil_moisture": 60.0,
            },
        },
        {
            "label": "Tomato — temperature warning",
            "features": {
                "temperature":   32.5,   # above 30 * 1.0 — warning zone
                "humidity":      70.0,
                "ph":            6.2,
                "light_lux":  50000.0,
                "co2_ppm":     1000.0,
                "soil_moisture": 65.0,
            },
        },
        {
            "label": "Spinach — critical pH",
            "features": {
                "temperature":   16.0,
                "humidity":      62.0,
                "ph":            4.5,    # well below 6.0 * 0.85 = 5.1 — critical
                "light_lux":  18000.0,
                "co2_ppm":      800.0,
                "soil_moisture": 55.0,
            },
        },
    ]

    models_to_test = ["random_forest", "logistic_regression", "svc", "neural_network"]

    for example in examples:
        print(f"\n{'='*60}")
        print(f"  {example['label']}")
        print(f"{'='*60}")
        for model_name in models_to_test:
            try:
                result = predict(example["features"], model_name=model_name)
                print(
                    f"  [{model_name:<22}]  "
                    f"{result['predicted_class']:<10}  "
                    f"confidence={result['confidence']:.4f}"
                )
            except FileNotFoundError as e:
                print(f"  [{model_name:<22}]  Model not found — run train_model.py first")
                break
