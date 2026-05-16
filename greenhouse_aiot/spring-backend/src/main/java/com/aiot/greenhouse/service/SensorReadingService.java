package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.SensorReadingRequest;
import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.repository.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de gestión de lecturas de sensores IoT.
 */
@Service
@RequiredArgsConstructor
public class SensorReadingService {

    private final SensorReadingRepository readingRepository;
    private final DeviceService deviceService;
    private final MessageSource messageSource;

    /**
     * Lista las lecturas de un dispositivo con paginación.
     *
     * @param deviceId ID del dispositivo
     * @param limit    número máximo de lecturas a devolver
     * @return lista de lecturas ordenadas por fecha descendente
     */
    @Transactional(readOnly = true)
    public List<SensorReading> findByDevice(Long deviceId, int limit) {
        return readingRepository.findByDeviceIdOrderByRecordedAtDesc(
                deviceId, PageRequest.of(0, limit));
    }

    /**
     * Lista las lecturas de un dispositivo en un rango de fechas.
     *
     * @param deviceId ID del dispositivo
     * @param from     inicio del rango
     * @param to       fin del rango
     * @return lecturas en el rango dado
     */
    @Transactional(readOnly = true)
    public List<SensorReading> findByDeviceAndDateRange(Long deviceId, LocalDateTime from, LocalDateTime to) {
        return readingRepository.findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(deviceId, from, to);
    }

    /**
     * Obtiene la lectura más reciente de cualquier dispositivo.
     *
     * @return lectura más reciente
     */
    @Transactional(readOnly = true)
    public SensorReading findLatest() {
        return readingRepository.findLatest().orElse(null);
    }

    /**
     * Registra una nueva lectura de sensor en el sistema.
     *
     * @param request datos de la lectura
     * @return lectura guardada
     */
    @Transactional
    public SensorReading create(SensorReadingRequest request) {
        SensorReading reading = SensorReading.builder()
                .device(deviceService.findById(request.getDeviceId()))
                .temperature(request.getTemperature())
                .humidity(request.getHumidity())
                .ph(request.getPh())
                .lightLux(request.getLightLux())
                .co2Ppm(request.getCo2Ppm())
                .soilMoisture(request.getSoilMoisture())
                .isSimulated(request.isSimulated())
                .build();

        return readingRepository.save(reading);
    }
}
