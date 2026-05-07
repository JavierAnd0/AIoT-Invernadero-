package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.SensorReadingRequest;
import com.aiot.greenhouse.model.SensorReading;
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

    /** Registra una nueva lectura de sensor. */
    @PostMapping
    @Operation(summary = "Registrar lectura de sensor")
    public ResponseEntity<SensorReading> create(@Valid @RequestBody SensorReadingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(readingService.create(request));
    }
}
