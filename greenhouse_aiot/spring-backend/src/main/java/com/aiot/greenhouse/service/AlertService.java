package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Alert;
import com.aiot.greenhouse.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio de gestión del ciclo de vida de alertas del invernadero.
 */
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final MessageSource messageSource;

    /**
     * Lista todas las alertas del sistema.
     *
     * @return lista completa de alertas
     */
    @Transactional(readOnly = true)
    public List<Alert> findAll() {
        return alertRepository.findAll();
    }

    /**
     * Lista las alertas con estado OPEN (pendientes de atender).
     *
     * @return alertas abiertas
     */
    @Transactional(readOnly = true)
    public List<Alert> findOpen() {
        return alertRepository.findByStatus(Alert.AlertStatus.OPEN);
    }

    /**
     * Lista alertas por estado aceptando valores frontend en minúscula.
     *
     * @param status estado de alerta
     * @return alertas con el estado solicitado
     */
    @Transactional(readOnly = true)
    public List<Alert> findByStatus(String status) {
        Alert.AlertStatus parsed = Alert.AlertStatus.valueOf(status.toUpperCase());
        return alertRepository.findByStatus(parsed);
    }

    /**
     * Obtiene una alerta por su ID.
     *
     * @param id identificador de la alerta
     * @return alerta encontrada
     */
    @Transactional(readOnly = true)
    public Alert findById(Long id) {
        return alertRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                    messageSource.getMessage("error.alert.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Marca una alerta como ACKNOWLEDGED (reconocida por el operador).
     *
     * @param id ID de la alerta
     * @return alerta actualizada
     */
    @Transactional
    public Alert acknowledge(Long id) {
        Alert alert = findById(id);
        alert.setStatus(Alert.AlertStatus.ACKNOWLEDGED);
        return alertRepository.save(alert);
    }

    /**
     * Marca una alerta como RESOLVED (problema corregido).
     *
     * @param id ID de la alerta
     * @return alerta actualizada con timestamp de resolución
     */
    @Transactional
    public Alert resolve(Long id) {
        Alert alert = findById(id);
        alert.setStatus(Alert.AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    /**
     * Descarta una alerta (no requiere acción).
     *
     * @param id ID de la alerta
     * @return alerta actualizada
     */
    @Transactional
    public Alert dismiss(Long id) {
        Alert alert = findById(id);
        alert.setStatus(Alert.AlertStatus.DISMISSED);
        return alertRepository.save(alert);
    }
}
