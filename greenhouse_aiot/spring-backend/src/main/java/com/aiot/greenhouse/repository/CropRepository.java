package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Crop;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    Optional<Crop> findByBatchCode(String batchCode);

    /** Cultivos activos en una zona (excluye cosechados y fallidos). Usado por el motor de alertas. */
    @Query("SELECT c FROM Crop c JOIN FETCH c.cropType WHERE c.zone.id = :zoneId " +
           "AND c.status NOT IN (com.aiot.greenhouse.model.Crop.CropStatus.HARVESTED, " +
           "                     com.aiot.greenhouse.model.Crop.CropStatus.FAILED)")
    List<Crop> findActiveCropsByZoneId(@Param("zoneId") Long zoneId);
}
