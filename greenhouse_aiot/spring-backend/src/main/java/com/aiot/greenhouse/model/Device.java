package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Nodo sensor IoT físico o simulado desplegado en una zona del invernadero.
 */
@Entity
@Table(name = "devices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "devices", "crops"})
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "registered_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "authorities"})
    private User registeredBy;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "serial_number", unique = true, length = 60)
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", length = 20)
    @Builder.Default
    private DeviceType deviceType = DeviceType.SIMULATED;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private DeviceStatus status = DeviceStatus.ONLINE;

    @Column(name = "firmware_version", length = 20)
    private String firmwareVersion;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Tipos de dispositivo IoT soportados. */
    public enum DeviceType {
        SENSOR_NODE, ACTUATOR, GATEWAY, SIMULATED
    }

    /** Estados operacionales del dispositivo. */
    public enum DeviceStatus {
        ONLINE, OFFLINE, ERROR, MAINTENANCE
    }
}
