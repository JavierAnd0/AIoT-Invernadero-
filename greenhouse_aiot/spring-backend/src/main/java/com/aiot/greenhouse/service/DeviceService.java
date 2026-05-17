package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.DeviceRequest;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de gestión de dispositivos IoT del invernadero.
 */
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final ZoneService zoneService;
    private final MessageSource messageSource;

    /**
     * Lista todos los dispositivos registrados en el sistema.
     *
     * @return lista de dispositivos
     */
    @Transactional(readOnly = true)
    public List<Device> findAll() {
        return deviceRepository.findAll();
    }

    /**
     * Obtiene un dispositivo por su ID.
     *
     * @param id identificador del dispositivo
     * @return dispositivo encontrado
     */
    @Transactional(readOnly = true)
    public Device findById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                    messageSource.getMessage("error.device.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Lista los dispositivos registrados en una zona específica.
     *
     * @param zoneId ID de la zona
     * @return dispositivos en esa zona
     */
    @Transactional(readOnly = true)
    public List<Device> findByZone(Long zoneId) {
        return deviceRepository.findByZoneId(zoneId);
    }

    /**
     * Registra un nuevo dispositivo IoT en el sistema.
     *
     * @param request    datos del nuevo dispositivo
     * @param registeredBy usuario que registra el dispositivo
     * @return dispositivo creado
     */
    @Transactional
    public Device create(DeviceRequest request, User registeredBy) {
        Device device = Device.builder()
                .zone(zoneService.findById(request.getZoneId()))
                .registeredBy(registeredBy)
                .name(request.getName())
                .serialNumber(request.getSerialNumber())
                .deviceType(request.getDeviceType())
                .firmwareVersion(request.getFirmwareVersion())
                .build();

        return deviceRepository.save(device);
    }

    /**
     * Actualiza el estado operacional de un dispositivo.
     *
     * @param id     ID del dispositivo
     * @param status nuevo estado del dispositivo
     * @return dispositivo actualizado
     */
    @Transactional
    public Device updateStatus(Long id, Device.DeviceStatus status) {
        Device device = findById(id);
        device.setStatus(status);
        return deviceRepository.save(device);
    }
}
