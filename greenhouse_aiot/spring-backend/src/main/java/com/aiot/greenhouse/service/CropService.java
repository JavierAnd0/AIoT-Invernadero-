package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.CropRequest;
import com.aiot.greenhouse.model.Crop;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.CropRepository;
import com.aiot.greenhouse.repository.CropTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de gestión de lotes de cultivo.
 */
@Service
@RequiredArgsConstructor
public class CropService {

    private final CropRepository cropRepository;
    private final CropTypeRepository cropTypeRepository;
    private final ZoneService zoneService;
    private final MessageSource messageSource;

    /**
     * Lista todos los lotes de cultivo registrados.
     *
     * @return lista de cultivos
     */
    @Transactional(readOnly = true)
    public List<Crop> findAll() {
        return cropRepository.findAll();
    }

    /**
     * Obtiene un cultivo por su ID.
     *
     * @param id identificador del cultivo
     * @return cultivo encontrado
     */
    @Transactional(readOnly = true)
    public Crop findById(Long id) {
        return cropRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                    messageSource.getMessage("error.crop.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Lista los cultivos activos en una zona específica.
     *
     * @param zoneId ID de la zona
     * @return cultivos en esa zona
     */
    @Transactional(readOnly = true)
    public List<Crop> findByZone(Long zoneId) {
        return cropRepository.findByZoneId(zoneId);
    }

    /**
     * Registra un nuevo lote de cultivo.
     *
     * @param request   datos del cultivo
     * @param createdBy usuario que crea el registro
     * @return cultivo creado
     */
    @Transactional
    public Crop create(CropRequest request, User createdBy) {
        var cropType = cropTypeRepository.findById(request.getCropTypeId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                    messageSource.getMessage("error.cropType.notFound", new Object[]{request.getCropTypeId()}, LocaleContextHolder.getLocale())));

        Crop crop = Crop.builder()
                .zone(zoneService.findById(request.getZoneId()))
                .cropType(cropType)
                .createdBy(createdBy)
                .batchCode(request.getBatchCode())
                .quantity(request.getQuantity())
                .plantedAt(request.getPlantedAt())
                .expectedHarvestAt(request.getExpectedHarvestAt())
                .notes(request.getNotes())
                .build();

        return cropRepository.save(crop);
    }

    /**
     * Actualiza el estado del ciclo de vida de un cultivo.
     *
     * @param id     ID del cultivo
     * @param status nuevo estado
     * @return cultivo actualizado
     */
    @Transactional
    public Crop updateStatus(Long id, Crop.CropStatus status) {
        Crop crop = findById(id);
        crop.setStatus(status);
        return cropRepository.save(crop);
    }
}
