FROM eclipse-temurin:21-jre-noble
WORKDIR /app

RUN apt-get update && \
    apt-get install -y python3 python3-pip wget && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install --no-cache-dir numpy joblib scikit-learn==1.8.0

COPY target/*.jar app.jar

COPY ai/ /app/ai/

ENV AI_SCRIPT_PATH=/app/ai/predict_cli.py
ENV PYTHON_CMD=python3

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
