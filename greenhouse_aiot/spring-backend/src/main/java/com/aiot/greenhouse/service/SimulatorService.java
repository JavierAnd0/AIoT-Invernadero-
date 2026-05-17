package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.repository.DeviceRepository;
import com.aiot.greenhouse.repository.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Simulador IoT integrado en Spring Boot.
 * Genera lecturas de sensores sintéticas para dispositivos marcados como SIMULATED.
 * Reemplaza el simulador anterior de Flask.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SimulatorService {

    private final DeviceRepository deviceRepository;
    private final SensorReadingRepository readingRepository;

    @Value("${app.simulator.enabled:true}")
    private boolean simulatorEnabled;

    @Value("${app.simulator.interval-ms:15000}")
    private long intervalMs;

    private final AtomicBoolean running      = new AtomicBoolean(false);
    private final AtomicLong    readingsCount = new AtomicLong(0);
    private volatile Instant    lastReadingAt = null;
    private final Random        random        = new Random();

    /**
     * Genera lecturas automáticas cada N ms para todos los dispositivos SIMULATED activos.
     * El intervalo se configura con app.simulator.interval-ms (default 15000ms).
     */
    @Scheduled(fixedDelayString = "${app.simulator.interval-ms:15000}")
    @Transactional
    public void generateReadings() {
        if (!simulatorEnabled || !running.get()) {
            return;
        }

        List<Device> simulatedDevices = deviceRepository.findByStatus(Device.DeviceStatus.ONLINE)
                .stream()
                .filter(d -> d.getDeviceType() == Device.DeviceType.SIMULATED)
                .toList();

        if (simulatedDevices.isEmpty()) {
            return;
        }

        for (Device device : simulatedDevices) {
            SensorReading reading = SensorReading.builder()
                    .device(device)
                    .temperature(randomDecimal(18.0, 32.0))
                    .humidity(randomDecimal(40.0, 85.0))
                    .ph(randomDecimal(5.5, 7.5))
                    .lightLux(randomDecimal(5000.0, 80000.0))
                    .co2Ppm(randomDecimal(400.0, 1500.0))
                    .soilMoisture(randomDecimal(30.0, 90.0))
                    .isSimulated(true)
                    .build();

            readingRepository.save(reading);
        }

        readingsCount.addAndGet(simulatedDevices.size());
        lastReadingAt = Instant.now();

        log.debug("Simulador: {} lecturas generadas para {} dispositivos",
                simulatedDevices.size(), simulatedDevices.size());
    }

    /**
     * Inicia el simulador IoT.
     *
     * @return estado actual del simulador
     */
    public SimulatorStatus start() {
        running.set(true);
        log.info("Simulador IoT iniciado");
        return getStatus();
    }

    /**
     * Detiene el simulador IoT.
     *
     * @return estado actual del simulador
     */
    public SimulatorStatus stop() {
        running.set(false);
        log.info("Simulador IoT detenido");
        return getStatus();
    }

    /**
     * Devuelve el estado actual del simulador.
     *
     * @return estado con flag de running y número de dispositivos simulados
     */
    public SimulatorStatus getStatus() {
        long activeDevices = deviceRepository.findByStatus(Device.DeviceStatus.ONLINE)
                .stream()
                .filter(d -> d.getDeviceType() == Device.DeviceType.SIMULATED)
                .count();

        return new SimulatorStatus(
            running.get(),
            activeDevices,
            readingsCount.get(),
            intervalMs / 1000,
            lastReadingAt != null ? lastReadingAt.toString() : null
        );
    }

    private BigDecimal randomDecimal(double min, double max) {
        double value = min + (max - min) * random.nextDouble();
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    /** Estado del simulador IoT. */
    public record SimulatorStatus(
        boolean running,
        long activeDevices,
        long readingsGenerated,
        long intervalSeconds,
        String lastReadingAt
    ) {}
}
