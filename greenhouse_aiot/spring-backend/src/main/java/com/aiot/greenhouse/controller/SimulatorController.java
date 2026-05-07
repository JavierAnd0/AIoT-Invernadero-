package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.service.SimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para el simulador IoT integrado en Spring Boot.
 */
@RestController
@RequestMapping("/api/v1/simulator")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Simulador IoT", description = "Control del generador de lecturas simuladas")
public class SimulatorController {

    private final SimulatorService simulatorService;

    /** Devuelve el estado actual del simulador. */
    @GetMapping("/status")
    @Operation(summary = "Estado del simulador")
    public ResponseEntity<SimulatorService.SimulatorStatus> status() {
        return ResponseEntity.ok(simulatorService.getStatus());
    }

    /** Inicia el simulador IoT. Solo ADMIN u OPERATOR. */
    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Iniciar simulador")
    public ResponseEntity<SimulatorService.SimulatorStatus> start() {
        return ResponseEntity.ok(simulatorService.start());
    }

    /** Detiene el simulador IoT. Solo ADMIN u OPERATOR. */
    @PostMapping("/stop")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Detener simulador")
    public ResponseEntity<SimulatorService.SimulatorStatus> stop() {
        return ResponseEntity.ok(simulatorService.stop());
    }
}
