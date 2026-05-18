package com.aiot.greenhouse.dto.request;

import com.aiot.greenhouse.model.ActuatorCommand;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Petición para emitir un comando a un actuador IoT. */
@Data
@Schema(description = "Comando a enviar a un actuador del invernadero")
public class ActuatorCommandRequest {

    @NotNull(message = "El tipo de comando es obligatorio")
    @JsonProperty("command_type")
    @JsonAlias("commandType")
    @Schema(
        description = "Tipo de acción a ejecutar en el actuador",
        example = "IRRIGATION_START",
        allowableValues = {
            "VENTILATION_OPEN", "VENTILATION_CLOSE",
            "IRRIGATION_START", "IRRIGATION_STOP",
            "LIGHTS_ON", "LIGHTS_OFF"
        }
    )
    private ActuatorCommand.CommandType commandType;
}
