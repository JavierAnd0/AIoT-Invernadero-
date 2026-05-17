# ── Stage 1: Build Spring Boot JAR ──────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
RUN apk add --no-cache maven
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -q

# ── Stage 2: Runtime con Java + Python para predicciones IA ─────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Instalar Python 3, wget (para healthcheck) y dependencias del modelo AI
RUN apt-get update && \
    apt-get install -y python3 python3-pip wget && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install --no-cache-dir numpy joblib scikit-learn==1.5.1

COPY --from=builder /build/target/*.jar app.jar

# Scripts e modelos de IA copiados al contexto de build por el step de CI
COPY ai/ /app/ai/

ENV AI_SCRIPT_PATH=/app/ai/predict_cli.py
ENV PYTHON_CMD=python3

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
