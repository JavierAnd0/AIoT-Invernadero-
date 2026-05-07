package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.SensorReading;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Repositorio de acceso a datos para lecturas de sensores. */
public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    List<SensorReading> findByDeviceIdOrderByRecordedAtDesc(Long deviceId, Pageable pageable);

    List<SensorReading> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long deviceId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT r FROM SensorReading r WHERE r.device.id = :deviceId ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatestByDeviceId(@Param("deviceId") Long deviceId);

    @Query("SELECT r FROM SensorReading r ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatest();
}
