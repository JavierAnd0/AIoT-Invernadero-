"""
REST API for greenhouse condition classification.
Exposes the predict module over HTTP and produces responses that map
directly to the `predictions` table schema defined in D1.

Endpoints:
    POST /predict           — single-sample inference
    POST /predict/batch     — batch inference (list of samples)
    GET  /models            — list available models
    GET  /health            — liveness check

Usage:
    pip install flask
    python api.py                   # development server on port 5000
    flask --app api run             # alternative
"""

import traceback
from datetime import datetime, timezone
from flask import Flask, request, jsonify, Response

from predict import predict, FEATURE_COLS, MODEL_VERSION, _SKLEARN_MODELS, _KERAS_MODELS

app = Flask(__name__)
app.json.sort_keys = False

VALID_MODELS = set(_SKLEARN_MODELS) | set(_KERAS_MODELS)
REQUIRED_FEATURES = set(FEATURE_COLS)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_features(payload: dict) -> tuple[dict | None, Response | None]:
    """Return (features_dict, None) on success or (None, error_response)."""
    if not isinstance(payload, dict):
        return None, (jsonify({"error": "Request body must be a JSON object."}), 400)

    features = payload.get("features")
    if not isinstance(features, dict):
        return None, (jsonify({"error": "'features' key is required and must be an object."}), 400)

    missing = REQUIRED_FEATURES - features.keys()
    if missing:
        return None, (jsonify({"error": f"Missing features: {sorted(missing)}"}), 422)

    # Coerce to float and check physical plausibility
    coerced: dict[str, float] = {}
    for feat in FEATURE_COLS:
        try:
            coerced[feat] = float(features[feat])
        except (TypeError, ValueError):
            return None, (jsonify({"error": f"Feature '{feat}' must be numeric."}), 422)

    return coerced, None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_version": MODEL_VERSION,
    })


@app.get("/models")
def list_models():
    """Return available model names and metadata."""
    return jsonify({
        "models": [
            {"name": "random_forest",       "type": "sklearn", "description": "RandomForestClassifier (n=200)"},
            {"name": "logistic_regression", "type": "sklearn", "description": "LogisticRegression (max_iter=1000)"},
            {"name": "svc",                 "type": "sklearn", "description": "SVC (rbf kernel, probability=True)"},
            {"name": "neural_network",      "type": "keras",   "description": "Sequential Dense 64→32→3 softmax"},
        ],
        "default_model": "random_forest",
        "model_version": MODEL_VERSION,
        "features": FEATURE_COLS,
    })


@app.post("/predict")
def predict_endpoint():
    """
    Single-sample inference.

    Request body:
        {
            "features": {
                "temperature":   20.0,
                "humidity":      65.0,
                "ph":             6.5,
                "light_lux":  25000.0,
                "co2_ppm":      900.0,
                "soil_moisture": 60.0
            },
            "model_name": "random_forest"   // optional
        }

    Response (maps to `predictions` table in D1):
        {
            "predicted_class":   "optimal",
            "confidence":         0.9412,
            "raw_probabilities":  {"critical": 0.02, "optimal": 0.94, "warning": 0.04},
            "model_name":        "random_forest",
            "model_version":     "1.0.0",
            "input_features":    { ... },
            "created_at":        "2026-04-30T12:00:00+00:00"
        }
    """
    payload = request.get_json(silent=True) or {}
    features, err = _validate_features(payload)
    if err:
        return err

    model_name = payload.get("model_name", "random_forest")
    if model_name not in VALID_MODELS:
        return jsonify({"error": f"Unknown model '{model_name}'. Valid: {sorted(VALID_MODELS)}"}), 400

    try:
        result = predict(features, model_name=model_name)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc), "hint": "Run train_model.py to generate model files."}), 503
    except Exception:
        return jsonify({"error": "Inference failed.", "detail": traceback.format_exc()}), 500

    result["created_at"] = datetime.now(timezone.utc).isoformat()
    return jsonify(result), 200


@app.post("/predict/batch")
def predict_batch():
    """
    Batch inference over a list of samples.

    Request body:
        {
            "samples": [
                {"features": {...}},
                {"features": {...}, "model_name": "svc"}
            ],
            "model_name": "random_forest"   // default for all samples
        }

    Response:
        {
            "results": [ {prediction}, ... ],
            "count": 2,
            "errors": []
        }
    """
    payload  = request.get_json(silent=True) or {}
    samples  = payload.get("samples")
    if not isinstance(samples, list) or len(samples) == 0:
        return jsonify({"error": "'samples' must be a non-empty list."}), 400

    default_model = payload.get("model_name", "random_forest")
    results: list[dict] = []
    errors:  list[dict] = []

    for idx, sample in enumerate(samples):
        features, err = _validate_features(sample)
        if err:
            errors.append({"index": idx, "error": err[0].get_json()["error"]})
            continue

        model_name = sample.get("model_name", default_model)
        if model_name not in VALID_MODELS:
            errors.append({"index": idx, "error": f"Unknown model '{model_name}'."})
            continue

        try:
            result = predict(features, model_name=model_name)
            result["created_at"] = datetime.now(timezone.utc).isoformat()
            results.append(result)
        except Exception as exc:
            errors.append({"index": idx, "error": str(exc)})

    return jsonify({"results": results, "count": len(results), "errors": errors}), 200


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
