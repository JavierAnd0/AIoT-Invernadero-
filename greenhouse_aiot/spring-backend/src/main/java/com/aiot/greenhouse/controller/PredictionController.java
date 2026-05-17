package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.service.PredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para predicciones de IA.
 * La inferencia se delega al script Python predict_cli.py via ProcessBuilder.
 */
@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Predicciones", description = "Inferencia de IA y historial de predicciones")
public class PredictionController {

    private final PredictionService predictionService;

    /** Lista todas las predicciones almacenadas, opcionalmente filtradas por dispositivo. */
    @GetMapping
    @Operation(summary = "Listar historial de predicciones")
    public ResponseEntity<List<Prediction>> getAll(
            @RequestParam(name = "device_id", required = false) Long deviceIdSnake,
            @RequestParam(name = "deviceId", required = false) Long deviceIdCamel) {
        Long deviceId = deviceIdSnake != null ? deviceIdSnake : deviceIdCamel;
        if (deviceId != null) {
            return ResponseEntity.ok(predictionService.findByDevice(deviceId));
        }
        return ResponseEntity.ok(predictionService.findAll());
    }

    /** Lista las predicciones de un dispositivo específico. */
    @GetMapping("/device/{deviceId}")
    @Operation(summary = "Predicciones de un dispositivo")
    public ResponseEntity<List<Prediction>> getByDevice(@PathVariable Long deviceId) {
        return ResponseEntity.ok(predictionService.findByDevice(deviceId));
    }

    /**
     * Solicita una nueva predicción de IA.
     * Acepta el formato plano del frontend:
     * { "device_id": 1, "temperature": 25.0, "humidity": 65.0, "ph": 6.5,
     *   "light_lux": 5000.0, "co2_ppm": 400.0 }
     * readingId es opcional — el servicio usa la lectura más reciente del dispositivo.
     */
    @PostMapping("/predict")
    @Operation(summary = "Solicitar predicción de IA")
    public ResponseEntity<?> predict(@RequestBody Map<String, Object> body) {
        Long deviceId = Long.valueOf(body.get("device_id").toString());

        Map<String, Object> features = new HashMap<>();
        for (String key : List.of("temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture")) {
            if (body.containsKey(key) && body.get(key) != null) {
                features.put(key, body.get(key));
            }
        }

        String modelName = body.containsKey("model_name")
                ? body.get("model_name").toString()
                : "random_forest";

        try {
            return ResponseEntity.ok(predictionService.predict(deviceId, null, features, modelName));
        } catch (RuntimeException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Servicio de predicción no disponible: " + e.getMessage()));
        }
    }
}
