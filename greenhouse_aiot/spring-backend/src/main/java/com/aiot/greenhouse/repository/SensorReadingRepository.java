package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.model.SensorReadingSummaryProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Repositorio de acceso a datos para lecturas de sensores. */
public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy"})
    List<SensorReading> findAllByOrderByRecordedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy"})
    List<SensorReading> findByDeviceIdOrderByRecordedAtDesc(Long deviceId, Pageable pageable);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy"})
    List<SensorReading> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long deviceId, LocalDateTime from, LocalDateTime to);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy"})
    @Query("SELECT r FROM SensorReading r WHERE r.device.id = :deviceId ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatestByDeviceId(@Param("deviceId") Long deviceId);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy"})
    @Query("SELECT r FROM SensorReading r ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatest();

    // ── Agregación para gráficas históricas ───────────────────────────────────

    /**
     * Promedios por hora de todas las variables de sensor para un device en un rango de fechas.
     * Usado para periodos de 24h y 7d (máx 168 puntos).
     */
    @Query(nativeQuery = true, value = """
            SELECT
                date_trunc('hour', recorded_at) AS bucket,
                AVG(temperature)   AS temperature,
                AVG(humidity)      AS humidity,
                AVG(ph)            AS ph,
                AVG(light_lux)     AS light_lux,
                AVG(co2_ppm)       AS co2_ppm,
                AVG(soil_moisture) AS soil_moisture,
                COUNT(*)           AS sample_count
            FROM sensor_readings
            WHERE device_id = :deviceId
              AND recorded_at BETWEEN :from AND :to
            GROUP BY bucket
            ORDER BY bucket ASC
            """)
    List<SensorReadingSummaryProjection> findHourlySummary(
            @Param("deviceId") Long deviceId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Promedios por día de todas las variables de sensor para un device en un rango de fechas.
     * Usado para el periodo de 30d (máx 30 puntos).
     */
    @Query(nativeQuery = true, value = """
            SELECT
                date_trunc('day', recorded_at) AS bucket,
                AVG(temperature)   AS temperature,
                AVG(humidity)      AS humidity,
                AVG(ph)            AS ph,
                AVG(light_lux)     AS light_lux,
                AVG(co2_ppm)       AS co2_ppm,
                AVG(soil_moisture) AS soil_moisture,
                COUNT(*)           AS sample_count
            FROM sensor_readings
            WHERE device_id = :deviceId
              AND recorded_at BETWEEN :from AND :to
            GROUP BY bucket
            ORDER BY bucket ASC
            """)
    List<SensorReadingSummaryProjection> findDailySummary(
            @Param("deviceId") Long deviceId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
