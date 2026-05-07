package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Repositorio de acceso a datos para usuarios del sistema. */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
