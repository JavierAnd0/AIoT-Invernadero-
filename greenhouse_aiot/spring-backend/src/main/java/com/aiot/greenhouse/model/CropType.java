package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Catálogo de especies de cultivo con sus condiciones óptimas de crecimiento.
 */
@Entity
@Table(name = "crop_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CropType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "crop_type_id")
    @JsonProperty("crop_type_id")
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "scientific_name", length = 150)
    private String scientificName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "temp_min", precision = 5, scale = 2)
    private BigDecimal tempMin;

    @Column(name = "temp_max", precision = 5, scale = 2)
    private BigDecimal tempMax;

    @Column(name = "temp_optimal", precision = 5, scale = 2)
    private BigDecimal tempOptimal;

    @Column(name = "humidity_min", precision = 5, scale = 2)
    private BigDecimal humidityMin;

    @Column(name = "humidity_max", precision = 5, scale = 2)
    private BigDecimal humidityMax;

    @Column(name = "ph_min", precision = 4, scale = 2)
    private BigDecimal phMin;

    @Column(name = "ph_max", precision = 4, scale = 2)
    private BigDecimal phMax;

    @Column(name = "light_min_lux", precision = 10, scale = 2)
    private BigDecimal lightMinLux;

    @Column(name = "light_max_lux", precision = 10, scale = 2)
    private BigDecimal lightMaxLux;

    @Column(name = "growth_days")
    private Integer growthDays;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
