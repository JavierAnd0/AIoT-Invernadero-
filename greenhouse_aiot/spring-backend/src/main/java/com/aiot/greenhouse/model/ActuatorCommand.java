package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Comando emitido a un dispositivo actuador del invernadero.
 *
 * Modela la cola de control IoT: ventilación, riego y luces.
 * Dispositivos simulados se marcan como EXECUTED inmediatamente al crear el comando.
 */
@Entity
@Table(name = "actuator_commands")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActuatorCommand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "command_id")
    @JsonProperty("command_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "registeredBy", "zone"})
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "googleId"})
    private User issuedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "command_type", nullable = false, length = 30)
    private CommandType commandType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private CommandStatus status = CommandStatus.EXECUTED;

    @Column(name = "issued_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime issuedAt = LocalDateTime.now();

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    // ── Enums ─────────────────────────────────────────────────────────────────

    public enum CommandType {
        VENTILATION_OPEN,
        VENTILATION_CLOSE,
        IRRIGATION_START,
        IRRIGATION_STOP,
        LIGHTS_ON,
        LIGHTS_OFF
    }

    public enum CommandStatus {
        PENDING,    // enviado, pendiente de confirmación
        EXECUTED,   // ejecutado (dispositivos simulados usan este estado directo)
        FAILED      // error al ejecutar
    }
}
