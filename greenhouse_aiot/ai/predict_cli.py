"""
CLI wrapper para el motor de predicciones IA del invernadero.
Llamado por Spring Boot via ProcessBuilder — lee JSON de stdin, escribe JSON a stdout.

Uso:
    echo '{"features": {...}, "model_name": "random_forest"}' | python3 predict_cli.py
"""
import json
import sys
from pathlib import Path

# Asegura que el directorio ai/ esté en el path para importar predict.py
sys.path.insert(0, str(Path(__file__).parent))

from predict import predict


def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        features = payload.get("features", {})
        model_name = payload.get("model_name", "logistic_regression")
        result = predict(features, model_name=model_name)
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        error = {"error": str(e), "type": type(e).__name__}
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
