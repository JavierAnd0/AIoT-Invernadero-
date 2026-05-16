package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Medición de sensores capturada por un dispositivo IoT en un momento dado.
 */
@Entity
@Table(name = "sensor_readings",
       indexes = {
           @Index(name = "idx_readings_device", columnList = "device_id"),
           @Index(name = "idx_readings_recorded_at", columnList = "recorded_at")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reading_id")
    @JsonProperty("reading_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "registeredBy", "zone"})
    private Device device;

    @Column(name = "temperature", precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(name = "humidity", precision = 5, scale = 2)
    private BigDecimal humidity;

    @Column(name = "ph", precision = 4, scale = 2)
    private BigDecimal ph;

    @Column(name = "light_lux", precision = 10, scale = 2)
    private BigDecimal lightLux;

    @Column(name = "co2_ppm", precision = 8, scale = 2)
    private BigDecimal co2Ppm;

    @Column(name = "soil_moisture", precision = 5, scale = 2)
    private BigDecimal soilMoisture;

    @Column(name = "recorded_at", nullable = false)
    @Builder.Default
    private LocalDateTime recordedAt = LocalDateTime.now();

    @Column(name = "is_simulated", nullable = false)
    @Builder.Default
    @JsonProperty("is_simulated")
    private boolean isSimulated = false;
}
