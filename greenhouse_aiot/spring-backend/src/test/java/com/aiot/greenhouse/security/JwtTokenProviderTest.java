package com.aiot.greenhouse.security;

import com.aiot.greenhouse.model.Role;
import com.aiot.greenhouse.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

/**
 * Tests unitarios del JwtTokenProvider: generación y validación de tokens.
 */
@DisplayName("JwtTokenProvider Tests")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret",
                "test-secret-key-for-junit-tests-only-256-bits-minimum-length");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 3600000L);

        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hash")
                .fullName("Test User")
                .role(Role.ADMIN)
                .build();
    }

    @Test
    @DisplayName("generateToken devuelve token no nulo")
    void generateToken_validUser_returnsToken() {
        String token = jwtTokenProvider.generateToken(testUser);

        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    @DisplayName("getUsernameFromToken extrae el username del token")
    void getUsernameFromToken_validToken_returnsUsername() {
        String token = jwtTokenProvider.generateToken(testUser);

        String username = jwtTokenProvider.getUsernameFromToken(token);

        assertThat(username).isEqualTo("testuser");
    }

    @Test
    @DisplayName("validateToken retorna true para token válido del mismo usuario")
    void validateToken_validToken_returnsTrue() {
        String token = jwtTokenProvider.generateToken(testUser);

        boolean valid = jwtTokenProvider.validateToken(token, testUser);

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("validateToken retorna false para token expirado")
    void validateToken_expiredToken_returnsFalse() {
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", -1000L);
        String expiredToken = jwtTokenProvider.generateToken(testUser);

        boolean valid = jwtTokenProvider.validateToken(expiredToken, testUser);

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("validateToken retorna false para token manipulado")
    void validateToken_tamperedToken_returnsFalse() {
        String token = jwtTokenProvider.generateToken(testUser);
        String tampered = token + "INVALID";

        boolean valid = jwtTokenProvider.validateToken(tampered, testUser);

        assertThat(valid).isFalse();
    }
}
