package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.service.PredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para predicciones de IA.
 * La inferencia se delega al microservicio Flask (puerto 5001).
 */
@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Predicciones", description = "Inferencia de IA y historial de predicciones")
public class PredictionController {

    private final PredictionService predictionService;

    /** Lista todas las predicciones almacenadas. */
    @GetMapping
    @Operation(summary = "Listar historial de predicciones")
    public ResponseEntity<List<Prediction>> getAll() {
        return ResponseEntity.ok(predictionService.findAll());
    }

    /** Lista las predicciones de un dispositivo específico. */
    @GetMapping("/device/{deviceId}")
    @Operation(summary = "Predicciones de un dispositivo")
    public ResponseEntity<List<Prediction>> getByDevice(@PathVariable Long deviceId) {
        return ResponseEntity.ok(predictionService.findByDevice(deviceId));
    }

    /**
     * Solicita una nueva predicción de IA al microservicio Flask.
     * Body: { "deviceId": 1, "readingId": 10, "features": {...}, "modelName": "random_forest" }
     */
    @PostMapping("/predict")
    @Operation(summary = "Solicitar predicción de IA",
               description = "Delega al microservicio Flask y persiste el resultado")
    public ResponseEntity<Prediction> predict(@RequestBody Map<String, Object> body) {
        Long deviceId = Long.valueOf(body.get("deviceId").toString());
        Long readingId = Long.valueOf(body.get("readingId").toString());
        @SuppressWarnings("unchecked")
        Map<String, Object> features = (Map<String, Object>) body.get("features");
        String modelName = (String) body.getOrDefault("modelName", "random_forest");

        return ResponseEntity.ok(predictionService.predict(deviceId, readingId, features, modelName));
    }
}
