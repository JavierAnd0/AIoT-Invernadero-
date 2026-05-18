package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.SensorReadingRequest;
import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.model.SensorReadingSummaryProjection;
import com.aiot.greenhouse.service.SensorReadingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controlador REST para lecturas de sensores IoT.
 */
@RestController
@RequestMapping("/api/v1/readings")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Lecturas de Sensores", description = "Ingestión y consulta de datos de sensores IoT")
public class SensorReadingController {

    private final SensorReadingService readingService;

    /** Lista lecturas recientes, opcionalmente filtradas por dispositivo. */
    @GetMapping
    @Operation(summary = "Listar lecturas recientes")
    public ResponseEntity<List<SensorReading>> getAll(
            @RequestParam(name = "device_id", required = false) Long deviceIdSnake,
            @RequestParam(name = "deviceId", required = false) Long deviceIdCamel,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        Long deviceId = deviceIdSnake != null ? deviceIdSnake : deviceIdCamel;
        if (deviceId != null) {
            if (from != null && to != null) {
                return ResponseEntity.ok(readingService.findByDeviceAndDateRange(deviceId, from, to));
            }
            return ResponseEntity.ok(readingService.findByDevice(deviceId, limit));
        }
        return ResponseEntity.ok(readingService.findAll(limit));
    }

    /** Lista lecturas de un dispositivo con límite opcional. */
    @GetMapping("/device/{deviceId}")
    @Operation(summary = "Lecturas de un dispositivo")
    public ResponseEntity<List<SensorReading>> getByDevice(
            @PathVariable Long deviceId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        if (from != null && to != null) {
            return ResponseEntity.ok(readingService.findByDeviceAndDateRange(deviceId, from, to));
        }
        return ResponseEntity.ok(readingService.findByDevice(deviceId, limit));
    }

    /** Obtiene la lectura más reciente del sistema. */
    @GetMapping("/latest")
    @Operation(summary = "Última lectura disponible")
    public ResponseEntity<SensorReading> getLatest() {
        return ResponseEntity.ok(readingService.findLatest());
    }

    /**
     * Devuelve promedios agregados para gráficas históricas.
     *
     * <ul>
     *   <li>{@code period=24h} → promedios horarios de las últimas 24 horas</li>
     *   <li>{@code period=7d}  → promedios horarios de los últimos 7 días</li>
     *   <li>{@code period=30d} → promedios diarios de los últimos 30 días</li>
     * </ul>
     */
    @GetMapping("/device/{deviceId}/summary")
    @Operation(summary = "Resumen histórico agregado de un dispositivo")
    public ResponseEntity<List<SensorReadingSummaryProjection>> getSummary(
            @PathVariable Long deviceId,
            @RequestParam(defaultValue = "24h") String period) {
        return ResponseEntity.ok(readingService.getSummary(deviceId, period));
    }

    /** Registra una nueva lectura de sensor. */
    @PostMapping
    @Operation(summary = "Registrar lectura de sensor")
    public ResponseEntity<SensorReading> create(@Valid @RequestBody SensorReadingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(readingService.create(request));
    }
}
