package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.LoginRequest;
import com.aiot.greenhouse.dto.request.RegisterRequest;
import com.aiot.greenhouse.dto.response.AuthResponse;

import com.aiot.greenhouse.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests unitarios del AuthController usando MockMvc.
 * Verifica login exitoso, credenciales inválidas y registro de usuario.
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest extends AbstractControllerTest {

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Login exitoso devuelve 200 con token JWT")
    void login_validCredentials_returns200WithToken() throws Exception {
        AuthResponse mockResponse = AuthResponse.builder()
                .token("mock.jwt.token")
                .username("admin")
                .email("admin@greenhouse.com")
                .role("ADMIN")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock.jwt.token"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("Login con credenciales inválidas devuelve 401")
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("wrongpassword");

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login con campos vacíos devuelve 400")
    void login_emptyFields_returns400() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("");
        request.setPassword("");

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Registro de nuevo usuario devuelve 200")
    void register_validData_returns200() throws Exception {
        AuthResponse mockResponse = AuthResponse.builder()
                .token("new.user.token")
                .username("newuser")
                .email("newuser@test.com")
                .role("VIEWER")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(mockResponse);

        RegisterRequest request = new RegisterRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@test.com");
        request.setPassword("password123");
        request.setFullName("New User");

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newuser"));
    }

    @Test
    @DisplayName("Registro con email inválido devuelve 400")
    void register_invalidEmail_returns400() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("user");
        request.setEmail("not-an-email");
        request.setPassword("password123");
        request.setFullName("Test User");

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.field_errors.email").exists());
    }
}
