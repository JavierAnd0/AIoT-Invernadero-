package com.aiot.greenhouse.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("user_id")
    private Long userId;

    @Schema(description = "Nombre de usuario")
    private String username;

    @Schema(description = "Correo electrónico")
    private String email;

    @Schema(description = "Nombre completo")
    @JsonProperty("full_name")
    private String fullName;

    @Schema(description = "Rol en el sistema")
    private String role;

    @Schema(description = "Proveedor de autenticación")
    @JsonProperty("auth_provider")
    private String authProvider;

    @Schema(description = "Fecha de creación")
    @JsonProperty("created_at")
    private java.time.LocalDateTime createdAt;

    @Schema(description = "Fecha de actualización")
    @JsonProperty("updated_at")
    private java.time.LocalDateTime updatedAt;

    @Schema(description = "URL del avatar")
    @JsonProperty("avatar_url")
    private String avatarUrl;
}
