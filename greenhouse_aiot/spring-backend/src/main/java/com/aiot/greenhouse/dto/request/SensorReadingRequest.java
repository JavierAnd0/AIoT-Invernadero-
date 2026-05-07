package com.aiot.greenhouse.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/** Datos de una lectura de sensor enviada por un dispositivo IoT. */
@Data
@Schema(description = "Medición de sensores de un dispositivo")
public class SensorReadingRequest {

    @NotNull(message = "{validation.deviceId.required}")
    @Schema(description = "ID del dispositivo que envía la lectura", example = "1")
    private Long deviceId;

    @Schema(description = "Temperatura en °C", example = "22.50")
    private BigDecimal temperature;

    @Schema(description = "Humedad relativa en %", example = "65.30")
    private BigDecimal humidity;

    @Schema(description = "Nivel de pH", example = "6.50")
    private BigDecimal ph;

    @Schema(description = "Intensidad lumínica en lux", example = "3500.00")
    private BigDecimal lightLux;

    @Schema(description = "CO2 en ppm", example = "450.00")
    private BigDecimal co2Ppm;

    @Schema(description = "Humedad del suelo en %", example = "72.10")
    private BigDecimal soilMoisture;

    @Schema(description = "Si la lectura es simulada", example = "false")
    private boolean isSimulated = false;
}
