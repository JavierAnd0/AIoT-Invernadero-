package com.aiot.greenhouse.config;

import com.aiot.greenhouse.model.*;
import com.aiot.greenhouse.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

/**
 * Seed de demostración para GreenCore AIoT.
 *
 * En el primer arranque (o si el flag RESEED=true) limpia los datos del
 * backend Flask antiguo y los reemplaza con datos coherentes con la UI.
 *
 * Pobla: Usuarios · Zonas · Tipos de cultivo · Dispositivos · Cultivos ·
 *        Lecturas de sensores (24 h) · Alertas (8)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository          userRepository;
    private final ZoneRepository          zoneRepository;
    private final CropTypeRepository      cropTypeRepository;
    private final DeviceRepository        deviceRepository;
    private final CropRepository          cropRepository;
    private final SensorReadingRepository readingRepository;
    private final AlertRepository         alertRepository;
    private final PasswordEncoder         passwordEncoder;
    private final JdbcTemplate            jdbc;

    /** Cambia a true para forzar un re-seed completo en el próximo reinicio. */
    private static final boolean FORCE_RESEED = true;

    private final Random rnd = new Random(42);

    @Override
    @Transactional
    public void run(String... args) {
        boolean needsSeed = FORCE_RESEED || zoneRepository.count() == 0;

        // Always ensure roles are correct, regardless of seed
        ensureRoles();

        if (!needsSeed) {
            log.info("DataInitializer: data present and FORCE_RESEED=false — skipping.");
            return;
        }

        log.info("DataInitializer: clearing old data and seeding fresh demo data...");
        clearAll();

        // ── 1. Users ─────────────────────────────────────────────────────────
        User admin  = upsertUser("admin",    "admin@greencorefarms.io",   "System Administrator", Role.ADMIN,    "GreenCore2025!");
        User carlos = upsertUser("carlos_m", "carlos@greencorefarms.io",  "Carlos Morales",        Role.OPERATOR, "GreenCore2025!");
        User ana    = upsertUser("ana_g",    "ana@greencorefarms.io",     "Ana García",            Role.VIEWER,   "GreenCore2025!");

        // ── 2. Zones ─────────────────────────────────────────────────────────
        Zone zA = save(Zone.builder().name("Zona A — Tomates")
                .description("Invernadero principal, bancales 1-6").areaM2(d("120.00")).isActive(true).build());
        Zone zB = save(Zone.builder().name("Zona B — Lechugas")
                .description("Invernadero hidropónico NFT").areaM2(d("80.00")).isActive(true).build());
        Zone zC = save(Zone.builder().name("Zona C — Hierbas")
                .description("Producción aromáticas y medicinales").areaM2(d("45.00")).isActive(true).build());
        Zone zD = save(Zone.builder().name("Zona D — Pimientos")
                .description("Invernadero climatizado sur").areaM2(d("95.00")).isActive(true).build());

        // ── 3. Crop types ────────────────────────────────────────────────────
        CropType tomato   = saveCT("Tomate Cherry",   "Solanum lycopersicum var. cerasiforme",
                "Tomate pequeño ideal para cultivo hidropónico.", 18,27,22, 65,85, 5.5,6.5, 15000,75000, 75);
        CropType lettuce  = saveCT("Lechuga Batavia",  "Lactuca sativa var. capitata",
                "Variedad rizada resistente, ideal para NFT.",    12,22,18, 60,80, 5.8,6.8, 10000,50000, 45);
        CropType basil    = saveCT("Albahaca",          "Ocimum basilicum",
                "Hierba aromática de alto valor comercial.",      18,30,24, 50,75, 5.5,7.0, 20000,60000, 60);
        CropType pepper   = saveCT("Pimiento Rojo",     "Capsicum annuum",
                "Pimiento dulce de alta producción.",             20,30,25, 60,80, 6.0,7.0, 20000,80000, 90);
        CropType cucumber = saveCT("Pepino",            "Cucumis sativus",
                "Ciclo corto para mercados locales.",             18,28,24, 70,90, 5.5,6.5, 20000,70000, 55);

        // ── 4. Devices ───────────────────────────────────────────────────────
        Device d1 = saveDevice(zA, admin,  "Nodo-A1",   "SN-001-A1", Device.DeviceType.SIMULATED,   Device.DeviceStatus.ONLINE,  "2.1.4");
        Device d2 = saveDevice(zA, admin,  "Nodo-A2",   "SN-001-A2", Device.DeviceType.SIMULATED,   Device.DeviceStatus.ONLINE,  "2.1.4");
        Device d3 = saveDevice(zB, admin,  "Nodo-B1",   "SN-002-B1", Device.DeviceType.SIMULATED,   Device.DeviceStatus.ONLINE,  "2.1.4");
        Device d4 = saveDevice(zB, admin,  "Nodo-B2",   "SN-002-B2", Device.DeviceType.SENSOR_NODE, Device.DeviceStatus.OFFLINE, "2.0.1");
        Device d5 = saveDevice(zC, carlos, "Nodo-C1",   "SN-003-C1", Device.DeviceType.SIMULATED,   Device.DeviceStatus.ONLINE,  "2.1.4");
        Device d6 = saveDevice(zD, carlos, "Nodo-D1",   "SN-004-D1", Device.DeviceType.SIMULATED,   Device.DeviceStatus.ONLINE,  "2.1.4");
        Device d7 = saveDevice(zD, admin,  "Gateway-D", "SN-004-GW", Device.DeviceType.GATEWAY,     Device.DeviceStatus.ONLINE,  "1.8.0");

        // ── 5. Crops ─────────────────────────────────────────────────────────
        saveCrop(zA, tomato,   admin,  "TC-2026-001", 450, daysAgo(32), Crop.CropStatus.GROWING,     "Lote primavera, riego por goteo");
        saveCrop(zA, tomato,   carlos, "TC-2026-002", 200, daysAgo(10), Crop.CropStatus.GERMINATING, "Segunda siembra, bancales 4-6");
        saveCrop(zB, lettuce,  carlos, "LB-2026-001", 600, daysAgo(25), Crop.CropStatus.GROWING,     "NFT canal 1-4, densidad alta");
        saveCrop(zB, lettuce,  carlos, "LB-2026-002", 300, daysAgo(40), Crop.CropStatus.FLOWERING,   "NFT canal 5-6, próxima cosecha");
        saveCrop(zC, basil,    ana,    "AB-2026-001", 800, daysAgo(20), Crop.CropStatus.GROWING,     "Para restaurantes locales");
        saveCrop(zC, cucumber, ana,    "PK-2026-001", 120, daysAgo(55), Crop.CropStatus.HARVESTED,   "Cosecha completada 2026-04-15");
        saveCrop(zD, pepper,   admin,  "PR-2026-001", 350, daysAgo(45), Crop.CropStatus.GROWING,     "Sistema RDOS, semana 7");
        saveCrop(zD, pepper,   admin,  "PR-2026-002", 180, daysAgo(5),  Crop.CropStatus.GERMINATING, "Nueva siembra variedad California");

        // ── 6. Sensor readings (últimas 24 h para dispositivos ONLINE) ───────
        LocalDateTime now = LocalDateTime.now();
        List<Device> online = List.of(d1, d2, d3, d5, d6, d7);
        for (Device dev : online) {
            for (int i = 23; i >= 0; i--) {
                readingRepository.save(SensorReading.builder()
                        .device(dev)
                        .temperature(r(18.0, 29.0)).humidity(r(55.0, 82.0))
                        .ph(r(5.5, 7.2)).lightLux(r(8000.0, 72000.0))
                        .co2Ppm(r(400.0, 1200.0)).soilMoisture(r(35.0, 85.0))
                        .recordedAt(now.minusHours(i))
                        .isSimulated(dev.getDeviceType() == Device.DeviceType.SIMULATED)
                        .build());
            }
        }

        // ── 7. Alerts ────────────────────────────────────────────────────────
        saveAlert(d1, Alert.AlertType.TEMPERATURE, Alert.Severity.HIGH,
                "Temperatura sobre umbral: 31.2 °C (máx 27 °C)",
                d("31.2"), d("27.0"), Alert.AlertStatus.OPEN, null);
        saveAlert(d3, Alert.AlertType.PH, Alert.Severity.MEDIUM,
                "pH fuera de rango: 7.4 (máx 6.8)",
                d("7.4"), d("6.8"), Alert.AlertStatus.OPEN, null);
        saveAlert(d4, Alert.AlertType.DEVICE_OFFLINE, Alert.Severity.CRITICAL,
                "Dispositivo Nodo-B2 sin respuesta por más de 2 horas",
                null, null, Alert.AlertStatus.OPEN, null);
        saveAlert(d5, Alert.AlertType.HUMIDITY, Alert.Severity.LOW,
                "Humedad bajo mínimo: 48% (mín 50%)",
                d("48.0"), d("50.0"), Alert.AlertStatus.ACKNOWLEDGED, null);
        saveAlert(d6, Alert.AlertType.CO2, Alert.Severity.MEDIUM,
                "CO₂ elevado: 1450 ppm (máx 1200 ppm)",
                d("1450.0"), d("1200.0"), Alert.AlertStatus.ACKNOWLEDGED, null);
        saveAlert(d1, Alert.AlertType.LIGHT, Alert.Severity.LOW,
                "Radiación bajo óptimo en hora pico: 7200 lux",
                d("7200.0"), d("15000.0"), Alert.AlertStatus.RESOLVED, now.minusHours(6));
        saveAlert(d2, Alert.AlertType.SOIL_MOISTURE, Alert.Severity.HIGH,
                "Humedad de sustrato crítica: 28% (mín 35%)",
                d("28.0"), d("35.0"), Alert.AlertStatus.RESOLVED, now.minusHours(12));
        saveAlert(d6, Alert.AlertType.TEMPERATURE, Alert.Severity.CRITICAL,
                "Temperatura crítica: 33.8 °C (máx 30 °C)",
                d("33.8"), d("30.0"), Alert.AlertStatus.RESOLVED, now.minusDays(1));

        log.info("DataInitializer: seed done — zones:4 cropTypes:5 devices:7 crops:8 readings:{} alerts:8",
                online.size() * 24);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void clearAll() {
        // Drop legacy columns from previous iterations that violate NOT NULL constraints
        try {
            jdbc.execute("ALTER TABLE zones DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE devices DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE crops DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE users DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE sensor_readings DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE predictions DROP COLUMN IF EXISTS tenant_id CASCADE");
            jdbc.execute("ALTER TABLE crop_types DROP COLUMN IF EXISTS tenant_id CASCADE");
        } catch (Exception e) {
            log.warn("Warning while dropping legacy columns: {}", e.getMessage());
        }

        // Order matters due to FK constraints
        jdbc.update("DELETE FROM alerts");
        jdbc.update("DELETE FROM predictions");
        jdbc.update("DELETE FROM sensor_readings");
        jdbc.update("DELETE FROM crops");
        jdbc.update("DELETE FROM devices");
        jdbc.update("DELETE FROM zones");
        jdbc.update("DELETE FROM crop_types");
        log.info("DataInitializer: old data cleared.");
    }

    private void ensureRoles() {
        fixRole("admin",    Role.ADMIN);
        fixRole("carlos_m", Role.OPERATOR);
    }

    private void fixRole(String username, Role role) {
        userRepository.findByUsername(username).ifPresent(u -> {
            if (u.getRole() != role) { u.setRole(role); userRepository.save(u); }
        });
    }

    private User upsertUser(String username, String email, String fullName, Role role, String pw) {
        return userRepository.findByUsername(username).map(u -> {
            if (u.getRole() != role) { u.setRole(role); return userRepository.save(u); }
            return u;
        }).orElseGet(() -> userRepository.save(User.builder()
                .username(username).email(email).fullName(fullName)
                .passwordHash(passwordEncoder.encode(pw))
                .role(role).authProvider("local").build()));
    }

    private Zone save(Zone z) { return zoneRepository.save(z); }

    private CropType saveCT(String name, String sci, String desc,
                            int tMin, int tMax, int tOpt, int hMin, int hMax,
                            double phMin, double phMax,
                            int lMin, int lMax, int days) {
        return cropTypeRepository.save(CropType.builder()
                .name(name).scientificName(sci).description(desc)
                .tempMin(d(tMin)).tempMax(d(tMax)).tempOptimal(d(tOpt))
                .humidityMin(d(hMin)).humidityMax(d(hMax))
                .phMin(BigDecimal.valueOf(phMin)).phMax(BigDecimal.valueOf(phMax))
                .lightMinLux(d(lMin)).lightMaxLux(d(lMax))
                .growthDays(days).build());
    }

    private Device saveDevice(Zone zone, User by, String name, String serial,
                              Device.DeviceType type, Device.DeviceStatus status, String fw) {
        return deviceRepository.save(Device.builder()
                .zone(zone).registeredBy(by).name(name).serialNumber(serial)
                .deviceType(type).status(status).firmwareVersion(fw)
                .lastSeenAt(LocalDateTime.now()).build());
    }

    private void saveCrop(Zone zone, CropType ct, User by, String batch,
                          int qty, LocalDate planted, Crop.CropStatus status, String notes) {
        cropRepository.save(Crop.builder()
                .zone(zone).cropType(ct).createdBy(by).batchCode(batch)
                .quantity(qty).plantedAt(planted)
                .expectedHarvestAt(planted.plusDays(ct.getGrowthDays()))
                .status(status).notes(notes).build());
    }

    private void saveAlert(Device dev, Alert.AlertType type, Alert.Severity severity,
                           String msg, BigDecimal measured, BigDecimal threshold,
                           Alert.AlertStatus status, LocalDateTime resolvedAt) {
        alertRepository.save(Alert.builder()
                .device(dev).alertType(type).severity(severity)
                .message(msg).measuredValue(measured).thresholdValue(threshold)
                .status(status).resolvedAt(resolvedAt)
                .createdAt(LocalDateTime.now().minusMinutes(rnd.nextInt(180) + 5))
                .build());
    }

    private BigDecimal r(double min, double max) {
        return BigDecimal.valueOf(min + (max - min) * rnd.nextDouble())
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private BigDecimal d(String v) { return new BigDecimal(v); }
    private BigDecimal d(int v)    { return new BigDecimal(v); }

    private LocalDate daysAgo(int n) { return LocalDate.now().minusDays(n); }
}
