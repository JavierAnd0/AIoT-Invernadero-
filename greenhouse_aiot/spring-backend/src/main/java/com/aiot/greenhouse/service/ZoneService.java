package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.ZoneRequest;
import com.aiot.greenhouse.model.Zone;
import com.aiot.greenhouse.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de gestión de zonas del invernadero.
 */
@Service
@RequiredArgsConstructor
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final MessageSource messageSource;

    /**
     * Obtiene todas las zonas activas del sistema.
     *
     * @return lista de zonas activas
     */
    @Transactional(readOnly = true)
    public List<Zone> findAll() {
        return zoneRepository.findByIsActiveTrue();
    }

    /**
     * Obtiene una zona por su ID.
     *
     * @param id identificador de la zona
     * @return zona encontrada
     */
    @Transactional(readOnly = true)
    public Zone findById(Long id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                    messageSource.getMessage("error.zone.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Crea una nueva zona en el invernadero.
     *
     * @param request datos de la nueva zona
     * @return zona creada
     */
    @Transactional
    public Zone create(ZoneRequest request) {
        if (zoneRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException(
                messageSource.getMessage("error.zone.nameTaken", null, LocaleContextHolder.getLocale()));
        }

        Zone zone = Zone.builder()
                .name(request.getName())
                .description(request.getDescription())
                .areaM2(request.getAreaM2())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return zoneRepository.save(zone);
    }

    /**
     * Actualiza los datos de una zona existente.
     *
     * @param id      ID de la zona a actualizar
     * @param request nuevos datos de la zona
     * @return zona actualizada
     */
    @Transactional
    public Zone update(Long id, ZoneRequest request) {
        Zone zone = findById(id);
        zone.setName(request.getName());
        zone.setDescription(request.getDescription());
        zone.setAreaM2(request.getAreaM2());
        if (request.getIsActive() != null) {
            zone.setActive(request.getIsActive());
        }
        return zoneRepository.save(zone);
    }

    /**
     * Desactiva (soft delete) una zona del sistema.
     *
     * @param id ID de la zona a desactivar
     */
    @Transactional
    public void deactivate(Long id) {
        Zone zone = findById(id);
        zone.setActive(false);
        zoneRepository.save(zone);
    }
}
