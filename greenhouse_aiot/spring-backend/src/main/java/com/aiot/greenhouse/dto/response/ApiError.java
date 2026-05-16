package com.aiot.greenhouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/** Estructura estándar para respuestas de error de la API. */
@Data @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Respuesta de error de la API")
public class ApiError {

    @Schema(description = "Código HTTP del error", example = "400")
    private int status;

    @Schema(description = "Mensaje descriptivo del error")
    private String message;

    @Schema(description = "Timestamp del error")
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Schema(description = "Errores de validación por campo")
    @JsonProperty("field_errors")
    private Map<String, String> fieldErrors;
}
