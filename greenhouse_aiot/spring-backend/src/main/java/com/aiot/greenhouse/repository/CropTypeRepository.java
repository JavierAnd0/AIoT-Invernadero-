package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.CropType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Repositorio de acceso a datos para tipos de cultivo. */
public interface CropTypeRepository extends JpaRepository<CropType, Long> {

    boolean existsByName(String name);

    Optional<CropType> findByName(String name);
}
