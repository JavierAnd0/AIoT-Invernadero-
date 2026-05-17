package com.aiot.greenhouse.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Datos para registrar un nuevo usuario en el sistema. */
@Data
@Schema(description = "Datos de registro de nuevo usuario")
public class RegisterRequest {

    @NotBlank(message = "{validation.username.required}")
    @Size(min = 3, max = 80, message = "{validation.username.size}")
    @Schema(description = "Nombre de usuario único", example = "jdoe")
    private String username;

    @NotBlank(message = "{validation.email.required}")
    @Email(message = "{validation.email.invalid}")
    @Schema(description = "Correo electrónico", example = "jdoe@example.com")
    private String email;

    @NotBlank(message = "{validation.password.required}")
    @Size(min = 6, message = "{validation.password.size}")
    @Schema(description = "Contraseña (mínimo 6 caracteres)")
    private String password;

    @NotBlank(message = "{validation.fullName.required}")
    @JsonProperty("full_name")
    @JsonAlias("fullName")
    @Schema(description = "Nombre completo", example = "John Doe")
    private String fullName;
}
