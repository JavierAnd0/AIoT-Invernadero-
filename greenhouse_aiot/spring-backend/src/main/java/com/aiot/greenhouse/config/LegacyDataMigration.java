package com.aiot.greenhouse.config;

import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.Crop;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migración de datos heredados del backend Flask.
 *
 * El backend Flask guardaba los valores de enum en minúsculas (ej: 'simulated', 'growing').
 * Spring Boot + Hibernate esperan MAYÚSCULAS (ej: 'SIMULATED', 'GROWING').
 * Este componente corrige los datos en la BD una sola vez al arrancar.
 */
@Configuration
@Slf4j
public class LegacyDataMigration {

    private final JdbcTemplate jdbc;

    public LegacyDataMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void migrateLegacyEnumValues() {
        log.info("LegacyDataMigration: correcting lowercase enum values from Flask backend...");

        // Fix Device.device_type
        int dtFixed = jdbc.update(
            "UPDATE devices SET device_type = UPPER(device_type) WHERE device_type != UPPER(device_type)"
        );

        // Fix Device.status
        int dsFixed = jdbc.update(
            "UPDATE devices SET status = UPPER(status) WHERE status != UPPER(status)"
        );

        // Fix Crop.status
        int csFixed = jdbc.update(
            "UPDATE crops SET status = UPPER(status) WHERE status != UPPER(status)"
        );

        // Fix Alert.alert_type
        int atFixed = jdbc.update(
            "UPDATE alerts SET alert_type = UPPER(alert_type) WHERE alert_type != UPPER(alert_type)"
        );

        // Fix Alert.severity
        int asFixed = jdbc.update(
            "UPDATE alerts SET severity = UPPER(severity) WHERE severity != UPPER(severity)"
        );

        // Fix Alert.status
        int alsFixed = jdbc.update(
            "UPDATE alerts SET status = UPPER(status) WHERE status != UPPER(status)"
        );

        log.info("LegacyDataMigration done — devices.type:{} devices.status:{} crops.status:{} alerts.type:{} alerts.severity:{} alerts.status:{}",
            dtFixed, dsFixed, csFixed, atFixed, asFixed, alsFixed);
    }
}
