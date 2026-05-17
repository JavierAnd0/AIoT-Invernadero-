package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.repository.PredictionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Servicio de predicciones de IA.
 * Invoca el script Python predict_cli.py via ProcessBuilder — sin Flask, sin HTTP.
 * Los modelos entrenados viven en greenhouse_aiot/ai/models/.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final PredictionRepository predictionRepository;
    private final DeviceService deviceService;
    private final SensorReadingService readingService;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.script-path:../ai/predict_cli.py}")
    private String aiScriptPath;

    @Value("${app.ai.python-cmd:python3}")
    private String pythonCmd;

    /**
     * Lista todas las predicciones almacenadas.
     *
     * @return lista de predicciones
     */
    @Transactional(readOnly = true)
    public List<Prediction> findAll() {
        return predictionRepository.findAll();
    }

    /**
     * Lista las predicciones de un dispositivo específico.
     *
     * @param deviceId ID del dispositivo
     * @return predicciones ordenadas por fecha descendente
     */
    @Transactional(readOnly = true)
    public List<Prediction> findByDevice(Long deviceId) {
        return predictionRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId);
    }

    /**
     * Ejecuta el modelo de IA llamando a predict_cli.py via ProcessBuilder.
     * Envía el payload JSON por stdin y lee el resultado por stdout.
     * No requiere Flask ni ningún servidor HTTP externo.
     *
     * @param deviceId  ID del dispositivo fuente
     * @param readingId ID de la lectura de sensor usada como entrada
     * @param features  mapa de características: temperature, humidity, ph, light_lux, co2_ppm, soil_moisture
     * @param modelName nombre del modelo: random_forest (default), logistic_regression, svc, neural_network
     * @return predicción persistida en la base de datos
     */
    @Transactional
    public Prediction predict(Long deviceId, Long readingId, Map<String, Object> features, String modelName) {
        Map<String, Object> result = runPythonPredictor(features, modelName != null ? modelName : "logistic_regression");

        @SuppressWarnings("unchecked")
        Map<String, Double> rawProbs = (Map<String, Double>) result.get("raw_probabilities");

        Prediction prediction = Prediction.builder()
                .device(deviceService.findById(deviceId))
                .reading(readingService.findByDevice(deviceId, 1).stream().findFirst()
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Lectura no encontrada")))
                .modelName((String) result.get("model_name"))
                .modelVersion((String) result.getOrDefault("model_version", "1.0"))
                .predictedClass(Prediction.PredictedClass.valueOf(
                    ((String) result.get("predicted_class")).toUpperCase()))
                .confidence(BigDecimal.valueOf(((Number) result.get("confidence")).doubleValue()))
                .rawProbabilities(rawProbs)
                .inputFeatures(features)
                .build();

        return predictionRepository.save(prediction);
    }

    /**
     * Invoca predict_cli.py con el payload JSON via stdin y retorna el resultado como Map.
     * Lanza RuntimeException si el proceso falla o retorna error.
     */
    private Map<String, Object> runPythonPredictor(Map<String, Object> features, String modelName) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                "features", features,
                "model_name", modelName
            ));

            ProcessBuilder pb = new ProcessBuilder(pythonCmd, aiScriptPath);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            // Enviar payload por stdin
            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(payload.getBytes(StandardCharsets.UTF_8));
            }

            // Leer stdout (resultado)
            String stdout;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                stdout = reader.lines().reduce("", String::concat);
            }

            // Leer stderr para logging
            String stderr;
            try (BufferedReader errReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                stderr = errReader.lines().reduce("", String::concat);
            }

            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("El proceso de predicción excedió el tiempo límite (30s)");
            }

            if (process.exitValue() != 0) {
                log.error("predict_cli.py falló (exit {}): {}", process.exitValue(), stderr);
                throw new RuntimeException("Error en el modelo de predicción: " + stderr);
            }

            if (!stderr.isBlank()) {
                log.warn("predict_cli.py stderr: {}", stderr);
            }

            return objectMapper.readValue(stdout, new TypeReference<>() {});

        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            log.error("Error al ejecutar predict_cli.py: {}", e.getMessage(), e);
            throw new RuntimeException("Servicio de predicción no disponible: " + e.getMessage());
        }
    }
}
