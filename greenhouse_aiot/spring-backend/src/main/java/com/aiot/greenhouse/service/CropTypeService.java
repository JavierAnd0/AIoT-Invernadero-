package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.CropTypeRequest;
import com.aiot.greenhouse.model.CropType;
import com.aiot.greenhouse.repository.CropTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio para gestión del catálogo de tipos de cultivo.
 */
@Service
@RequiredArgsConstructor
public class CropTypeService {

    private final CropTypeRepository cropTypeRepository;
    private final MessageSource messageSource;

    /**
     * Obtiene todos los tipos de cultivo registrados.
     *
     * @return lista completa de tipos de cultivo
     */
    @Transactional(readOnly = true)
    public List<CropType> findAll() {
        return cropTypeRepository.findAll();
    }

    /**
     * Obtiene un tipo de cultivo por su ID.
     *
     * @param id identificador del tipo de cultivo
     * @return tipo de cultivo encontrado
     */
    @Transactional(readOnly = true)
    public CropType findById(Long id) {
        return cropTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                    messageSource.getMessage("error.cropType.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Crea un nuevo tipo de cultivo en el catálogo.
     *
     * @param request datos del nuevo tipo de cultivo
     * @return tipo de cultivo creado
     */
    @Transactional
    public CropType create(CropTypeRequest request) {
        if (cropTypeRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException(
                messageSource.getMessage("error.cropType.nameTaken", null, LocaleContextHolder.getLocale()));
        }
        CropType cropType = CropType.builder()
                .name(request.getName())
                .scientificName(request.getScientificName())
                .description(request.getDescription())
                .tempMin(request.getTempMin())
                .tempMax(request.getTempMax())
                .tempOptimal(request.getTempOptimal())
                .humidityMin(request.getHumidityMin())
                .humidityMax(request.getHumidityMax())
                .phMin(request.getPhMin())
                .phMax(request.getPhMax())
                .lightMinLux(request.getLightMinLux())
                .lightMaxLux(request.getLightMaxLux())
                .growthDays(request.getGrowthDays())
                .build();
        return cropTypeRepository.save(cropType);
    }

    /**
     * Actualiza un tipo de cultivo existente.
     *
     * @param id      ID del tipo de cultivo
     * @param request nuevos datos
     * @return tipo de cultivo actualizado
     */
    @Transactional
    public CropType update(Long id, CropTypeRequest request) {
        CropType cropType = findById(id);
        cropType.setName(request.getName());
        cropType.setScientificName(request.getScientificName());
        cropType.setDescription(request.getDescription());
        cropType.setTempMin(request.getTempMin());
        cropType.setTempMax(request.getTempMax());
        cropType.setTempOptimal(request.getTempOptimal());
        cropType.setHumidityMin(request.getHumidityMin());
        cropType.setHumidityMax(request.getHumidityMax());
        cropType.setPhMin(request.getPhMin());
        cropType.setPhMax(request.getPhMax());
        cropType.setLightMinLux(request.getLightMinLux());
        cropType.setLightMaxLux(request.getLightMaxLux());
        cropType.setGrowthDays(request.getGrowthDays());
        return cropTypeRepository.save(cropType);
    }

    /**
     * Elimina un tipo de cultivo del catálogo.
     *
     * @param id ID del tipo de cultivo a eliminar
     */
    @Transactional
    public void delete(Long id) {
        CropType cropType = findById(id);
        cropTypeRepository.delete(cropType);
    }
}
