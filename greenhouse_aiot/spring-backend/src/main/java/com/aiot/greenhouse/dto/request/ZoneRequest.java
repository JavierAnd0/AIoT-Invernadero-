package com.aiot.greenhouse.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

/** Datos para crear o actualizar una zona del invernadero. */
@Data
@Schema(description = "Datos de zona del invernadero")
public class ZoneRequest {

    @NotBlank(message = "{validation.name.required}")
    @Schema(description = "Nombre único de la zona", example = "Zona A - Lechugas")
    private String name;

    @Schema(description = "Descripción de la zona")
    private String description;

    @JsonProperty("area_m2")
    @JsonAlias("areaM2")
    @Schema(description = "Área en metros cuadrados", example = "25.50")
    private BigDecimal areaM2;

    @JsonProperty("is_active")
    @JsonAlias({"isActive", "active"})
    @Schema(description = "Si la zona está activa", example = "true")
    private Boolean isActive = true;
}
