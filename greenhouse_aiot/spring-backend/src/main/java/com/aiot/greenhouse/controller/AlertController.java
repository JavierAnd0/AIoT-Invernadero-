package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Alert;
import com.aiot.greenhouse.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para gestión del ciclo de vida de alertas.
 */
@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Alertas", description = "Gestión de alertas automáticas del invernadero")
public class AlertController {

    private final AlertService alertService;

    /** Lista todas las alertas del sistema. */
    @GetMapping
    @Operation(summary = "Listar todas las alertas")
    public ResponseEntity<List<Alert>> getAll() {
        return ResponseEntity.ok(alertService.findAll());
    }

    /** Lista solo las alertas abiertas (pendientes). */
    @GetMapping("/open")
    @Operation(summary = "Listar alertas abiertas")
    public ResponseEntity<List<Alert>> getOpen() {
        return ResponseEntity.ok(alertService.findOpen());
    }

    /** Obtiene una alerta por su ID. */
    @GetMapping("/{id}")
    @Operation(summary = "Obtener alerta por ID")
    public ResponseEntity<Alert> getById(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.findById(id));
    }

    /** Marca la alerta como reconocida por el operador. */
    @PutMapping("/{id}/acknowledge")
    @Operation(summary = "Reconocer alerta")
    public ResponseEntity<Alert> acknowledge(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.acknowledge(id));
    }

    /** Marca la alerta como resuelta. */
    @PutMapping("/{id}/resolve")
    @Operation(summary = "Resolver alerta")
    public ResponseEntity<Alert> resolve(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.resolve(id));
    }

    /** Descarta la alerta. */
    @PutMapping("/{id}/dismiss")
    @Operation(summary = "Descartar alerta")
    public ResponseEntity<Alert> dismiss(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.dismiss(id));
    }
}
