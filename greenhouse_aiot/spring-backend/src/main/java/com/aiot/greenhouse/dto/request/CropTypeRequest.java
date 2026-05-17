package com.aiot.greenhouse.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("scientific_name")
    @JsonAlias("scientificName")
    @Schema(description = "Nombre científico", example = "Solanum lycopersicum")
    private String scientificName;

    @Schema(description = "Descripción del cultivo")
    private String description;

    @JsonProperty("temp_min")
    @JsonAlias("tempMin")
    @Schema(description = "Temperatura mínima (°C)", example = "15.0")
    private BigDecimal tempMin;

    @JsonProperty("temp_max")
    @JsonAlias("tempMax")
    @Schema(description = "Temperatura máxima (°C)", example = "30.0")
    private BigDecimal tempMax;

    @JsonProperty("temp_optimal")
    @JsonAlias("tempOptimal")
    @Schema(description = "Temperatura óptima (°C)", example = "22.0")
    private BigDecimal tempOptimal;

    @JsonProperty("humidity_min")
    @JsonAlias("humidityMin")
    @Schema(description = "Humedad mínima (%)", example = "60.0")
    private BigDecimal humidityMin;

    @JsonProperty("humidity_max")
    @JsonAlias("humidityMax")
    @Schema(description = "Humedad máxima (%)", example = "80.0")
    private BigDecimal humidityMax;

    @JsonProperty("ph_min")
    @JsonAlias("phMin")
    @Schema(description = "pH mínimo", example = "6.0")
    private BigDecimal phMin;

    @JsonProperty("ph_max")
    @JsonAlias("phMax")
    @Schema(description = "pH máximo", example = "7.0")
    private BigDecimal phMax;

    @JsonProperty("light_min_lux")
    @JsonAlias("lightMinLux")
    @Schema(description = "Luz mínima (lux)", example = "10000.0")
    private BigDecimal lightMinLux;

    @JsonProperty("light_max_lux")
    @JsonAlias("lightMaxLux")
    @Schema(description = "Luz máxima (lux)", example = "80000.0")
    private BigDecimal lightMaxLux;

    @JsonProperty("growth_days")
    @JsonAlias("growthDays")
    @Schema(description = "Días de crecimiento estimados", example = "90")
    private Integer growthDays;
}
