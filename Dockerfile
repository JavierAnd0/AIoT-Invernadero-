# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY greenhouse_aiot/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages \
                    /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copiar código del backend
COPY greenhouse_aiot/backend/ .

# Copiar módulo de inferencia y modelos IA
COPY greenhouse_aiot/ai/predict.py ./ai/predict.py
COPY greenhouse_aiot/ai/models/ ./ai/models/

ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1 \
    PORT=5001 \
    AI_MODELS_PATH=ai/models \
    DEFAULT_MODEL=random_forest \
    SIMULATOR_INTERVAL=15

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 5001

CMD ["sh", "-c", "flask --app 'app:create_app(\"production\")' db upgrade && gunicorn 'app:create_app(\"production\")' --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 --access-logfile - --error-logfile -"]
