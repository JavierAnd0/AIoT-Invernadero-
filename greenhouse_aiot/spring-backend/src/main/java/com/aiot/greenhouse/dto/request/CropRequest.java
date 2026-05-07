package com.aiot.greenhouse.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

/** Datos para registrar un nuevo lote de cultivo. */
@Data
@Schema(description = "Datos de nuevo lote de cultivo")
public class CropRequest {

    @NotNull(message = "{validation.zoneId.required}")
    @Schema(description = "ID de la zona donde se planta", example = "1")
    private Long zoneId;

    @NotNull(message = "{validation.cropTypeId.required}")
    @Schema(description = "ID del tipo de cultivo", example = "1")
    private Long cropTypeId;

    @Schema(description = "Código único del lote", example = "BATCH-2024-001")
    private String batchCode;

    @NotNull @Positive(message = "{validation.quantity.positive}")
    @Schema(description = "Número de plantas", example = "100")
    private Integer quantity;

    @NotNull(message = "{validation.plantedAt.required}")
    @Schema(description = "Fecha de siembra", example = "2024-01-15")
    private LocalDate plantedAt;

    @Schema(description = "Fecha estimada de cosecha", example = "2024-03-01")
    private LocalDate expectedHarvestAt;

    @Schema(description = "Notas adicionales")
    private String notes;
}
