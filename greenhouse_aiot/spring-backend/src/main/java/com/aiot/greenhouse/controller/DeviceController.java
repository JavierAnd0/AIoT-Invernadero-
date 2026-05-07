package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.DeviceRequest;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.DeviceService;
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
 * Controlador REST para gestión de dispositivos IoT.
 */
@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Dispositivos", description = "Gestión de dispositivos IoT del invernadero")
public class DeviceController {

    private final DeviceService deviceService;

    /** Lista todos los dispositivos registrados. */
    @GetMapping
    @Operation(summary = "Listar dispositivos")
    public ResponseEntity<List<Device>> getAll() {
        return ResponseEntity.ok(deviceService.findAll());
    }

    /** Obtiene un dispositivo por su ID. */
    @GetMapping("/{id}")
    @Operation(summary = "Obtener dispositivo por ID")
    public ResponseEntity<Device> getById(@PathVariable Long id) {
        return ResponseEntity.ok(deviceService.findById(id));
    }

    /** Registra un nuevo dispositivo. ADMIN u OPERATOR pueden crear. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Registrar dispositivo")
    public ResponseEntity<Device> create(@Valid @RequestBody DeviceRequest request,
                                          @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(request, user));
    }

    /** Actualiza el estado de un dispositivo. */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @Operation(summary = "Actualizar estado del dispositivo")
    public ResponseEntity<Device> updateStatus(@PathVariable Long id,
                                                @RequestBody Map<String, String> body) {
        Device.DeviceStatus status = Device.DeviceStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(deviceService.updateStatus(id, status));
    }
}
