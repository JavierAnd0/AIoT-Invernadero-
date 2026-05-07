package com.aiot.greenhouse.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Alerta automática generada cuando las lecturas de sensores salen de los rangos óptimos.
 */
@Entity
@Table(name = "alerts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reading_id")
    private SensorReading reading;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 30)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 10)
    @Builder.Default
    private Severity severity = Severity.MEDIUM;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "measured_value", precision = 10, scale = 2)
    private BigDecimal measuredValue;

    @Column(name = "threshold_value", precision = 10, scale = 2)
    private BigDecimal thresholdValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private AlertStatus status = AlertStatus.OPEN;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Tipo de magnitud que disparó la alerta. */
    public enum AlertType {
        TEMPERATURE, HUMIDITY, PH, LIGHT, CO2, SOIL_MOISTURE, DEVICE_OFFLINE, PREDICTION
    }

    /** Nivel de criticidad de la alerta. */
    public enum Severity {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    /** Estado del ciclo de vida de la alerta. */
    public enum AlertStatus {
        OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED
    }
}
