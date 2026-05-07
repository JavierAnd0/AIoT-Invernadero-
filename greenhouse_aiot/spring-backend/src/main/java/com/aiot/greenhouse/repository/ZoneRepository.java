package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de acceso a datos para zonas del invernadero. */
public interface ZoneRepository extends JpaRepository<Zone, Long> {

    List<Zone> findByIsActiveTrue();

    boolean existsByName(String name);
}
