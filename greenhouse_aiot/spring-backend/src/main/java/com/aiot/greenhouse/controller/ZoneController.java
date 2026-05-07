package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.ZoneRequest;
import com.aiot.greenhouse.model.Zone;
import com.aiot.greenhouse.service.ZoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para gestión de zonas del invernadero.
 */
@RestController
@RequestMapping("/api/v1/zones")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Zonas", description = "Gestión de zonas del invernadero")
public class ZoneController {

    private final ZoneService zoneService;

    /** Lista todas las zonas activas. */
    @GetMapping
    @Operation(summary = "Listar zonas activas")
    public ResponseEntity<List<Zone>> getAll() {
        return ResponseEntity.ok(zoneService.findAll());
    }

    /** Obtiene una zona por su ID. */
    @GetMapping("/{id}")
    @Operation(summary = "Obtener zona por ID")
    public ResponseEntity<Zone> getById(@PathVariable Long id) {
        return ResponseEntity.ok(zoneService.findById(id));
    }

    /** Crea una nueva zona. Solo ADMIN puede crear zonas. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear zona", description = "Solo administradores")
    public ResponseEntity<Zone> create(@Valid @RequestBody ZoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(zoneService.create(request));
    }

    /** Actualiza una zona existente. Solo ADMIN puede modificar zonas. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar zona")
    public ResponseEntity<Zone> update(@PathVariable Long id, @Valid @RequestBody ZoneRequest request) {
        return ResponseEntity.ok(zoneService.update(id, request));
    }

    /** Desactiva (soft delete) una zona. Solo ADMIN. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactivar zona")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        zoneService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
