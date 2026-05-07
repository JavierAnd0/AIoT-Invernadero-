package com.aiot.greenhouse.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Credenciales para autenticación por username/password. */
@Data
@Schema(description = "Credenciales de inicio de sesión")
public class LoginRequest {

    @NotBlank(message = "{validation.username.required}")
    @Schema(description = "Nombre de usuario o correo electrónico", example = "admin")
    private String username;

    @NotBlank(message = "{validation.password.required}")
    @Schema(description = "Contraseña del usuario", example = "secret123")
    private String password;
}
