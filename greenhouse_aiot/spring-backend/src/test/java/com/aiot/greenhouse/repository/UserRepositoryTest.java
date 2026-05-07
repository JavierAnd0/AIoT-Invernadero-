package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Role;
import com.aiot.greenhouse.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Tests de integración del UserRepository usando H2 en memoria.
 */
@DataJpaTest
@ActiveProfiles("test")
@DisplayName("UserRepository Tests")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private User buildTestUser(String username, String email) {
        return User.builder()
                .username(username)
                .email(email)
                .passwordHash("$2a$10$hashedpassword")
                .fullName("Test User")
                .role(Role.VIEWER)
                .build();
    }

    @Test
    @DisplayName("findByUsername devuelve usuario cuando existe")
    void findByUsername_existingUser_returnsUser() {
        userRepository.save(buildTestUser("testuser", "test@example.com"));

        Optional<User> result = userRepository.findByUsername("testuser");

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("findByUsername devuelve vacío cuando no existe")
    void findByUsername_nonExistingUser_returnsEmpty() {
        Optional<User> result = userRepository.findByUsername("ghost");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findByEmail devuelve usuario por correo")
    void findByEmail_existingEmail_returnsUser() {
        userRepository.save(buildTestUser("emailuser", "findme@example.com"));

        Optional<User> result = userRepository.findByEmail("findme@example.com");

        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("emailuser");
    }

    @Test
    @DisplayName("existsByUsername devuelve true cuando ya existe")
    void existsByUsername_existing_returnsTrue() {
        userRepository.save(buildTestUser("existing", "existing@example.com"));

        assertThat(userRepository.existsByUsername("existing")).isTrue();
    }

    @Test
    @DisplayName("existsByEmail devuelve false cuando no existe")
    void existsByEmail_nonExisting_returnsFalse() {
        assertThat(userRepository.existsByEmail("nobody@example.com")).isFalse();
    }

    @Test
    @DisplayName("Usuario con rol por defecto es VIEWER")
    void save_newUser_defaultRoleIsViewer() {
        User saved = userRepository.save(buildTestUser("newbie", "newbie@example.com"));

        assertThat(saved.getRole()).isEqualTo(Role.VIEWER);
        assertThat(saved.isActive()).isTrue();
    }
}
