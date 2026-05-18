package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.ActuatorCommandRequest;
import com.aiot.greenhouse.model.ActuatorCommand;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.ActuatorService;
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

/**
 * Controlador REST para control de actuadores IoT del invernadero.
 *
 * Permite consultar actuadores disponibles, su estado actual, historial de comandos
 * y emitir nuevos comandos de control (ventilación, riego, iluminación).
 */
@RestController
@RequestMapping("/api/v1/actuators")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Actuadores", description = "Control de actuadores IoT: ventilación, riego, luces")
public class ActuatorController {

    private final ActuatorService actuatorService;

    /** Lista todos los dispositivos de tipo ACTUATOR registrados. */
    @GetMapping
    @Operation(summary = "Listar actuadores")
    public ResponseEntity<List<Device>> listActuators() {
        return ResponseEntity.ok(actuatorService.findActuators());
    }

    /** Historial de comandos emitidos a un actuador. */
    @GetMapping("/{id}/commands")
    @Operation(summary = "Historial de comandos del actuador")
    public ResponseEntity<List<ActuatorCommand>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(actuatorService.getHistory(id));
    }

    /** Estado actual del actuador (último comando emitido). */
    @GetMapping("/{id}/state")
    @Operation(summary = "Estado actual del actuador")
    public ResponseEntity<ActuatorCommand> getState(@PathVariable Long id) {
        return actuatorService.getCurrentState(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /** Emite un nuevo comando a un actuador. Solo ADMIN u OPERATOR. */
    @PostMapping("/{id}/commands")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Emitir comando al actuador")
    public ResponseEntity<ActuatorCommand> issueCommand(
            @PathVariable Long id,
            @Valid @RequestBody ActuatorCommandRequest req,
            @AuthenticationPrincipal User user) {
        ActuatorCommand cmd = actuatorService.issueCommand(id, req.getCommandType(), user);
        return ResponseEntity.status(HttpStatus.CREATED).body(cmd);
    }
}
