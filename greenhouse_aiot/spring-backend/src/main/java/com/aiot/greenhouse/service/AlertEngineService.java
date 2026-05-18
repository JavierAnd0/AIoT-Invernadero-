package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Alert;
import com.aiot.greenhouse.model.Alert.AlertType;
import com.aiot.greenhouse.model.Alert.Severity;
import com.aiot.greenhouse.model.Alert.AlertStatus;
import com.aiot.greenhouse.model.CropType;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.repository.AlertRepository;
import com.aiot.greenhouse.repository.CropRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Motor de alertas automáticas del invernadero.
 *
 * Evalúa cada lectura de sensor contra los umbrales del CropType activo en la zona
 * del dispositivo y genera alertas de tipo OPEN cuando alguna variable sale del rango.
 * Deduplicación incluida: no crea una segunda alerta OPEN del mismo tipo para el
 * mismo dispositivo si ya existe una abierta.
 *
 * Se invoca desde SensorReadingService (por cada lectura) y desde PredictionService
 * (para predicciones críticas/warning del modelo IA).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertEngineService {

    private final AlertRepository alertRepository;
    private final CropRepository  cropRepository;

    @Value("${app.alerts.enabled:true}")
    private boolean alertsEnabled;

    /** Umbral fijo de CO₂ en ppm (CropType no tiene este campo). */
    @Value("${app.alerts.co2-max-ppm:1500}")
    private double co2MaxPpm;

    /** Umbral fijo mínimo de humedad de suelo en % (CropType no tiene este campo). */
    @Value("${app.alerts.soil-moisture-min-pct:25}")
    private double soilMoistureMinPct;

    /** Umbral fijo máximo de humedad de suelo en % (CropType no tiene este campo). */
    @Value("${app.alerts.soil-moisture-max-pct:95}")
    private double soilMoistureMaxPct;

    // ── Evaluación principal ──────────────────────────────────────────────────

    /**
     * Evalúa una lectura de sensor y genera alertas si alguna variable supera los umbrales
     * del cultivo activo en la zona del dispositivo.
     *
     * @param reading lectura de sensor recién guardada
     */
    @Transactional
    public void evaluate(SensorReading reading) {
        if (!alertsEnabled) return;

        Device device = reading.getDevice();
        if (device == null || device.getZone() == null) return;

        Long zoneId = device.getZone().getId();

        // Buscar el primer cultivo activo en la zona para obtener sus umbrales
        List<?> activeCrops = cropRepository.findActiveCropsByZoneId(zoneId);
        if (activeCrops.isEmpty()) {
            log.debug("AlertEngine: zona {} sin cultivos activos — sin evaluación", zoneId);
            return;
        }

        com.aiot.greenhouse.model.Crop crop =
                (com.aiot.greenhouse.model.Crop) activeCrops.get(0);
        CropType ct = crop.getCropType();

        // ── Evaluar cada variable ─────────────────────────────────────────────

        // Temperatura
        checkAndCreateAlert(device, reading,
                AlertType.TEMPERATURE,
                reading.getTemperature(),
                ct != null ? ct.getTempMin()  : null,
                ct != null ? ct.getTempMax()  : null,
                "°C");

        // Humedad relativa
        checkAndCreateAlert(device, reading,
                AlertType.HUMIDITY,
                reading.getHumidity(),
                ct != null ? ct.getHumidityMin() : null,
                ct != null ? ct.getHumidityMax() : null,
                "%");

        // pH
        checkAndCreateAlert(device, reading,
                AlertType.PH,
                reading.getPh(),
                ct != null ? ct.getPhMin() : null,
                ct != null ? ct.getPhMax() : null,
                "");

        // Luz
        checkAndCreateAlert(device, reading,
                AlertType.LIGHT,
                reading.getLightLux(),
                ct != null ? ct.getLightMinLux() : null,
                ct != null ? ct.getLightMaxLux() : null,
                " lux");

        // CO₂ — umbral fijo (CropType no tiene este campo)
        checkAndCreateAlert(device, reading,
                AlertType.CO2,
                reading.getCo2Ppm(),
                BigDecimal.ZERO,
                BigDecimal.valueOf(co2MaxPpm),
                " ppm");

        // Humedad de suelo — umbral fijo (CropType no tiene este campo)
        checkAndCreateAlert(device, reading,
                AlertType.SOIL_MOISTURE,
                reading.getSoilMoisture(),
                BigDecimal.valueOf(soilMoistureMinPct),
                BigDecimal.valueOf(soilMoistureMaxPct),
                "%");
    }

    // ── Alerta para predicciones IA ───────────────────────────────────────────

    /**
     * Genera una alerta de tipo PREDICTION cuando el modelo IA clasifica
     * la condición como WARNING o CRITICAL.
     *
     * @param prediction predicción guardada
     * @param severity   severidad calculada por el caller
     */
    @Transactional
    public void createPredictionAlert(Prediction prediction, Severity severity) {
        if (!alertsEnabled) return;

        Device device = prediction.getDevice();
        if (device == null) return;

        // Deduplicación: no crear si ya hay alerta PREDICTION OPEN para este device
        if (alertRepository.existsByDevice_IdAndAlertTypeAndStatus(
                device.getId(), AlertType.PREDICTION, AlertStatus.OPEN)) {
            log.debug("AlertEngine: alerta PREDICTION ya abierta para device {} — skip",
                    device.getId());
            return;
        }

        String msg = String.format(
                "IA clasificó condición como %s (confianza: %.0f%%)",
                prediction.getPredictedClass().name().toLowerCase(),
                prediction.getConfidence()
                          .multiply(BigDecimal.valueOf(100))
                          .doubleValue());

        alertRepository.save(Alert.builder()
                .device(device)
                .alertType(AlertType.PREDICTION)
                .severity(severity)
                .message(msg)
                .status(AlertStatus.OPEN)
                .build());

        log.info("AlertEngine: alerta PREDICTION {} generada para device {}",
                severity, device.getId());
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    /**
     * Compara un valor medido contra un rango [min, max] y crea una alerta si está fuera.
     * Skips si: valor es null, min/max ambos null, o ya existe alerta OPEN del mismo tipo.
     */
    private void checkAndCreateAlert(Device device,
                                     SensorReading reading,
                                     AlertType type,
                                     BigDecimal value,
                                     BigDecimal min,
                                     BigDecimal max,
                                     String unit) {
        if (value == null) return;
        if (min == null && max == null) return;

        boolean belowMin = min != null && value.compareTo(min) < 0;
        boolean aboveMax = max != null && value.compareTo(max) > 0;

        if (!belowMin && !aboveMax) return; // dentro del rango — sin alerta

        // Deduplicación
        if (alertRepository.existsByDevice_IdAndAlertTypeAndStatus(
                device.getId(), type, AlertStatus.OPEN)) {
            log.debug("AlertEngine: alerta {} ya abierta para device {} — skip",
                    type, device.getId());
            return;
        }

        BigDecimal threshold = belowMin ? min : max;
        Severity severity    = calculateSeverity(value, threshold);
        String   message     = buildMessage(type, value, threshold, belowMin, unit);

        alertRepository.save(Alert.builder()
                .device(device)
                .reading(reading)
                .alertType(type)
                .severity(severity)
                .message(message)
                .measuredValue(value)
                .thresholdValue(threshold)
                .status(AlertStatus.OPEN)
                .build());

        log.info("AlertEngine: alerta {} {} generada para device {} ({} {} umbral {}{})",
                severity, type, device.getId(),
                value.toPlainString(), belowMin ? "<" : ">",
                threshold.toPlainString(), unit);
    }

    /**
     * Calcula la severidad en función del porcentaje de desviación respecto al umbral cruzado.
     * <ul>
     *   <li>&lt; 10%  → LOW</li>
     *   <li>10–25%   → MEDIUM</li>
     *   <li>25–50%   → HIGH</li>
     *   <li>&gt; 50% → CRITICAL</li>
     * </ul>
     */
    private Severity calculateSeverity(BigDecimal value, BigDecimal threshold) {
        if (threshold.compareTo(BigDecimal.ZERO) == 0) return Severity.MEDIUM;
        double deviation = Math.abs(value.subtract(threshold).doubleValue())
                           / threshold.abs().doubleValue() * 100.0;
        if (deviation >= 50) return Severity.CRITICAL;
        if (deviation >= 25) return Severity.HIGH;
        if (deviation >= 10) return Severity.MEDIUM;
        return Severity.LOW;
    }

    /** Construye el mensaje en español que describe la alerta. */
    private String buildMessage(AlertType type,
                                BigDecimal value,
                                BigDecimal threshold,
                                boolean belowMin,
                                String unit) {
        String label = switch (type) {
            case TEMPERATURE   -> "Temperatura";
            case HUMIDITY      -> "Humedad";
            case PH            -> "pH";
            case LIGHT         -> "Luz";
            case CO2           -> "CO₂";
            case SOIL_MOISTURE -> "Humedad de suelo";
            default            -> type.name();
        };

        String direction = belowMin
                ? String.format("bajo mínimo: %.1f%s (mín %.1f%s)",
                        value.doubleValue(), unit, threshold.doubleValue(), unit)
                : String.format("sobre umbral: %.1f%s (máx %.1f%s)",
                        value.doubleValue(), unit, threshold.doubleValue(), unit);

        return label + " " + direction;
    }
}
