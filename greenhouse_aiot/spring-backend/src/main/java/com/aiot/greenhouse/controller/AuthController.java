package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.LoginRequest;
import com.aiot.greenhouse.dto.request.RegisterRequest;
import com.aiot.greenhouse.dto.response.AuthResponse;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

/**
 * Controlador de autenticación: login, registro y perfil del usuario.
 * Las rutas OAuth2 (/api/v1/auth/oauth2/**) son manejadas por Spring Security directamente.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Login, registro y perfil del usuario")
public class AuthController {

    private final AuthService authService;

    /**
     * Autentica con username/password y devuelve un JWT.
     */
    @PostMapping("/login")
    @Operation(summary = "Login con credenciales", description = "Autentica al usuario y devuelve JWT")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (AuthenticationServiceException e) {
            // Google-only accounts: tell the user to use Google sign-in
            if ("USE_GOOGLE_AUTH".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Esta cuenta usa Google para autenticarse. Por favor, usa el botón 'Continuar con Google'."));
            }
            // Other AuthenticationServiceException → let GlobalExceptionHandler produce i18n message
            throw new org.springframework.security.authentication.BadCredentialsException(e.getMessage(), e);
        }
        // BadCredentialsException propagates to GlobalExceptionHandler → $.message with i18n
    }

    /** Redirige al endpoint OAuth2 de Spring Security (compatibilidad con builds anteriores). */
    @GetMapping("/google")
    @Operation(summary = "Redirigir a Google OAuth2")
    public void googleRedirect(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/google");
    }

    /**
     * Registra un nuevo usuario en el sistema.
     */
    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Devuelve el perfil del usuario autenticado actualmente.
     */
    @GetMapping("/me")
    @Operation(summary = "Perfil del usuario autenticado")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.getMe(user));
    }

    /**
     * Compatibilidad con el frontend anterior a la simplificación multi-tenant.
     * La instalación actual es single-tenant, así que devuelve el token/rol vigente.
     */
    @PostMapping("/select-tenant")
    @Operation(summary = "Seleccionar tenant activo")
    public ResponseEntity<AuthResponse> selectTenant(@AuthenticationPrincipal User user,
                                                     @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(authService.refreshSession(user));
    }
}
