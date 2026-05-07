package com.aiot.greenhouse.dto.request;

import com.aiot.greenhouse.model.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Datos para actualizar un usuario")
public class UserUpdateRequest {

    @Size(max = 80)
    @Schema(description = "Nombre de usuario", example = "javier")
    private String username;

    @Email
    @Size(max = 120)
    @Schema(description = "Correo electrónico", example = "javier@example.com")
    private String email;

    @Size(max = 150)
    @Schema(description = "Nombre completo", example = "Javier Andrade")
    private String fullName;

    @Schema(description = "Rol del usuario")
    private Role role;

    @Schema(description = "Estado activo/inactivo")
    private Boolean isActive;
}
