package com.aiot.greenhouse.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "Datos para crear o actualizar un tipo de cultivo")
public class CropTypeRequest {

    @NotBlank
    @Size(max = 100)
    @Schema(description = "Nombre común del cultivo", example = "Tomate")
    private String name;

    @Size(max = 150)
    @Schema(description = "Nombre científico", example = "Solanum lycopersicum")
    private String scientificName;

    @Schema(description = "Descripción del cultivo")
    private String description;

    @Schema(description = "Temperatura mínima (°C)", example = "15.0")
    private BigDecimal tempMin;

    @Schema(description = "Temperatura máxima (°C)", example = "30.0")
    private BigDecimal tempMax;

    @Schema(description = "Temperatura óptima (°C)", example = "22.0")
    private BigDecimal tempOptimal;

    @Schema(description = "Humedad mínima (%)", example = "60.0")
    private BigDecimal humidityMin;

    @Schema(description = "Humedad máxima (%)", example = "80.0")
    private BigDecimal humidityMax;

    @Schema(description = "pH mínimo", example = "6.0")
    private BigDecimal phMin;

    @Schema(description = "pH máximo", example = "7.0")
    private BigDecimal phMax;

    @Schema(description = "Luz mínima (lux)", example = "10000.0")
    private BigDecimal lightMinLux;

    @Schema(description = "Luz máxima (lux)", example = "80000.0")
    private BigDecimal lightMaxLux;

    @Schema(description = "Días de crecimiento estimados", example = "90")
    private Integer growthDays;
}
