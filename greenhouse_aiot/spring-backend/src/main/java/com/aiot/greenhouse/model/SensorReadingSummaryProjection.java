package com.aiot.greenhouse.model;

import java.time.LocalDateTime;

/**
 * Proyección para la consulta nativa de agregación de lecturas de sensores.
 *
 * Usada por {@link com.aiot.greenhouse.repository.SensorReadingRepository#findSummaryByDeviceIdAndPeriod}
 * para devolver promedios horarios o diarios de cada variable sensorial.
 *
 * Los nombres de los getters deben coincidir exactamente (case-insensitive) con los alias de la query SQL.
 */
public interface SensorReadingSummaryProjection {

    LocalDateTime getBucket();

    Double getTemperature();

    Double getHumidity();

    Double getPh();

    Double getLightLux();

    Double getCo2Ppm();

    Double getSoilMoisture();

    Long getSampleCount();
}
