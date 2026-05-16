package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Crop;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repositorio de acceso a datos para lotes de cultivo. */
public interface CropRepository extends JpaRepository<Crop, Long> {

    @EntityGraph(attributePaths = {"zone", "cropType", "createdBy"})
    List<Crop> findAll();

    @EntityGraph(attributePaths = {"zone", "cropType", "createdBy"})
    Optional<Crop> findById(Long id);

    @EntityGraph(attributePaths = {"zone", "cropType", "createdBy"})
    List<Crop> findByZoneId(Long zoneId);

    @EntityGraph(attributePaths = {"zone", "cropType", "createdBy"})
    List<Crop> findByStatus(Crop.CropStatus status);
}
