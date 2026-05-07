package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.LoginRequest;
import com.aiot.greenhouse.dto.request.RegisterRequest;
import com.aiot.greenhouse.dto.response.AuthResponse;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Registra un nuevo usuario en el sistema.
     */
    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Devuelve el perfil del usuario autenticado actualmente.
     */
    @GetMapping("/me")
    @Operation(summary = "Perfil del usuario autenticado")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.getMe(user));
    }
}
