package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.CropType;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio de acceso a datos para tipos de cultivo. */
public interface CropTypeRepository extends JpaRepository<CropType, Long> {

    boolean existsByName(String name);
}
