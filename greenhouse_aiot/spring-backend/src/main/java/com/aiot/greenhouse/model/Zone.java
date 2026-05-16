package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Sección física o lógica del invernadero donde se ubican dispositivos y cultivos.
 */
@Entity
@Table(name = "zones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "zone_id")
    @JsonProperty("zone_id")
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "area_m2", precision = 8, scale = 2)
    private BigDecimal areaM2;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    @JsonProperty("is_active")
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
