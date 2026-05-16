package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lote de cultivo activo plantado en una zona específica del invernadero.
 */
@Entity
@Table(name = "crops")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Crop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "crop_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "devices", "crops"})
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "crop_type_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private CropType cropType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "authorities"})
    private User createdBy;

    @Column(name = "batch_code", unique = true, length = 50)
    private String batchCode;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "planted_at", nullable = false)
    private LocalDate plantedAt;

    @Column(name = "expected_harvest_at")
    private LocalDate expectedHarvestAt;

    @Column(name = "actual_harvest_at")
    private LocalDate actualHarvestAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private CropStatus status = CropStatus.GERMINATING;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Ciclo de vida de un lote de cultivo. */
    public enum CropStatus {
        GERMINATING, GROWING, FLOWERING, HARVESTED, FAILED
    }
}
