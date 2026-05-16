package com.aiot.greenhouse.config;

import com.aiot.greenhouse.model.Role;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Garantiza que los usuarios de demostración existan con el rol correcto
 * cada vez que arranque la aplicación.
 *
 * Lógica: si el usuario YA existe, solo actualiza su rol (upsert).
 * Así si el admin fue creado con VIEWER (bug conocido), se corrige solo.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        upsertUser("admin",    "admin@greencorefarms.io",    "System Administrator", Role.ADMIN,    "GreenCore2025!");
        upsertUser("carlos_m", "carlos@greencorefarms.io",  "Carlos Morales",        Role.OPERATOR, "GreenCore2025!");
        upsertUser("ana_g",    "ana@greencorefarms.io",     "Ana Garcia",            Role.VIEWER,   "GreenCore2025!");
    }

    private void upsertUser(String username, String email, String fullName, Role role, String password) {
        userRepository.findByUsername(username).ifPresentOrElse(
            existing -> {
                if (existing.getRole() != role) {
                    existing.setRole(role);
                    userRepository.save(existing);
                    log.info("DataInitializer: updated role for '{}' to {}", username, role);
                }
            },
            () -> {
                User user = User.builder()
                        .username(username)
                        .email(email)
                        .fullName(fullName)
                        .passwordHash(passwordEncoder.encode(password))
                        .role(role)
                        .authProvider("local")
                        .build();
                userRepository.save(user);
                log.info("DataInitializer: created user '{}' with role {}", username, role);
            }
        );
    }
}
