package com.aiot.greenhouse.dto.request;

import com.aiot.greenhouse.model.Device;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Datos para registrar un nuevo dispositivo IoT. */
@Data
@Schema(description = "Datos de registro de dispositivo IoT")
public class DeviceRequest {

    @NotNull(message = "{validation.zoneId.required}")
    @Schema(description = "ID de la zona donde se ubica el dispositivo", example = "1")
    private Long zoneId;

    @NotBlank(message = "{validation.name.required}")
    @Schema(description = "Nombre descriptivo del dispositivo", example = "Sensor Nodo 01")
    private String name;

    @Schema(description = "Número de serie único del hardware")
    private String serialNumber;

    @Schema(description = "Tipo de dispositivo")
    private Device.DeviceType deviceType = Device.DeviceType.SIMULATED;

    @Schema(description = "Versión de firmware instalada")
    private String firmwareVersion;
}
