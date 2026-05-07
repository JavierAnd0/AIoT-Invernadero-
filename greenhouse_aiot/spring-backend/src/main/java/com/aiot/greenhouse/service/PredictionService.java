package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.repository.PredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Servicio de predicciones de IA.
 * Delega la inferencia al microservicio Flask y persiste los resultados en la BD.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final PredictionRepository predictionRepository;
    private final DeviceService deviceService;
    private final SensorReadingService readingService;
    private final RestTemplate restTemplate;

    @Value("${app.flask-service-url}")
    private String flaskServiceUrl;

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
     * Solicita una predicción al microservicio Flask y persiste el resultado.
     * El features map debe contener: temperature, humidity, ph, light_lux, co2_ppm, soil_moisture.
     *
     * @param deviceId  ID del dispositivo
     * @param readingId ID de la lectura base
     * @param features  mapa de características para el modelo de IA
     * @param modelName nombre del modelo a usar (random_forest, neural_network, etc.)
     * @return predicción guardada
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public Prediction predict(Long deviceId, Long readingId, Map<String, Object> features, String modelName) {
        String url = flaskServiceUrl + "/api/v1/predict";

        Map<String, Object> payload = Map.of(
            "features", features,
            "model_name", modelName != null ? modelName : "random_forest"
        );

        Map<String, Object> flaskResponse;
        try {
            flaskResponse = restTemplate.exchange(
                url, HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(payload),
                new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();
        } catch (Exception e) {
            log.error("Error al contactar el microservicio Flask de predicciones: {}", e.getMessage());
            throw new RuntimeException("Servicio de predicción no disponible");
        }

        Prediction prediction = Prediction.builder()
                .device(deviceService.findById(deviceId))
                .reading(readingService.findByDevice(deviceId, 1).stream().findFirst()
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Lectura no encontrada")))
                .modelName((String) flaskResponse.get("model_name"))
                .predictedClass(Prediction.PredictedClass.valueOf(
                    ((String) flaskResponse.get("predicted_class")).toUpperCase()))
                .confidence(BigDecimal.valueOf(((Number) flaskResponse.get("confidence")).doubleValue()))
                .rawProbabilities((Map<String, Double>) flaskResponse.get("raw_probabilities"))
                .inputFeatures(features)
                .build();

        return predictionRepository.save(prediction);
    }
}
