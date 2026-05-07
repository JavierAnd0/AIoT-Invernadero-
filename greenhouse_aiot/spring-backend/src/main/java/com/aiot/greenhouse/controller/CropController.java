package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.CropRequest;
import com.aiot.greenhouse.model.Crop;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.CropService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión de lotes de cultivo.
 */
@RestController
@RequestMapping("/api/v1/crops")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Cultivos", description = "Gestión de lotes de cultivo del invernadero")
public class CropController {

    private final CropService cropService;

    /** Lista todos los cultivos. */
    @GetMapping
    @Operation(summary = "Listar cultivos")
    public ResponseEntity<List<Crop>> getAll() {
        return ResponseEntity.ok(cropService.findAll());
    }

    /** Obtiene un cultivo por su ID. */
    @GetMapping("/{id}")
    @Operation(summary = "Obtener cultivo por ID")
    public ResponseEntity<Crop> getById(@PathVariable Long id) {
        return ResponseEntity.ok(cropService.findById(id));
    }

    /** Lista cultivos de una zona específica. */
    @GetMapping("/zone/{zoneId}")
    @Operation(summary = "Cultivos de una zona")
    public ResponseEntity<List<Crop>> getByZone(@PathVariable Long zoneId) {
        return ResponseEntity.ok(cropService.findByZone(zoneId));
    }

    /** Registra un nuevo lote de cultivo. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Registrar nuevo cultivo")
    public ResponseEntity<Crop> create(@Valid @RequestBody CropRequest request,
                                        @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cropService.create(request, user));
    }

    /** Actualiza el estado del ciclo de vida del cultivo. */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Actualizar estado del cultivo")
    public ResponseEntity<Crop> updateStatus(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        Crop.CropStatus status = Crop.CropStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(cropService.updateStatus(id, status));
    }
}
