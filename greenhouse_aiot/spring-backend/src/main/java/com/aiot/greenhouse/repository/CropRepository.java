package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Crop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de acceso a datos para lotes de cultivo. */
public interface CropRepository extends JpaRepository<Crop, Long> {

    List<Crop> findByZoneId(Long zoneId);

    List<Crop> findByStatus(Crop.CropStatus status);
}
