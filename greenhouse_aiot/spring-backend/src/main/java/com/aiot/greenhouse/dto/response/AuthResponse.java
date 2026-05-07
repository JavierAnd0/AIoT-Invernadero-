package com.aiot.greenhouse.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Respuesta de autenticación exitosa con JWT y datos del usuario. */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Schema(description = "Token de acceso y datos del usuario autenticado")
public class AuthResponse {

    @Schema(description = "JWT Bearer token")
    private String token;

    @Schema(description = "Tipo de token", example = "Bearer")
    @Builder.Default
    private String tokenType = "Bearer";

    @Schema(description = "ID del usuario")
    private Long userId;

    @Schema(description = "Nombre de usuario")
    private String username;

    @Schema(description = "Correo electrónico")
    private String email;

    @Schema(description = "Nombre completo")
    private String fullName;

    @Schema(description = "Rol en el sistema")
    private String role;
}
