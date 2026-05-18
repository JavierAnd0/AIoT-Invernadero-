# Stage 1: build the JAR
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src/ src/
RUN mvn package -DskipTests -q

# Stage 2: runtime image
FROM eclipse-temurin:21-jre-noble
WORKDIR /app

RUN apt-get update && \
    apt-get install -y python3 python3-pip wget && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install --no-cache-dir --break-system-packages numpy joblib scikit-learn==1.8.0

COPY --from=builder /build/target/*.jar app.jar
COPY ai/ /app/ai/

ENV AI_SCRIPT_PATH=/app/ai/predict_cli.py
ENV PYTHON_CMD=python3

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
