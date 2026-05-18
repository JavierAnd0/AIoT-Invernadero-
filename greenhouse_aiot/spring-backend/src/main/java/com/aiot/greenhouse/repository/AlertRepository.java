package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Alert;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repositorio de acceso a datos para alertas del sistema. */
public interface AlertRepository extends JpaRepository<Alert, Long> {

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device",
                                   "assignedTo"})
    List<Alert> findAll();

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device",
                                   "assignedTo"})
    Optional<Alert> findById(Long id);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device",
                                   "assignedTo"})
    List<Alert> findByStatus(Alert.AlertStatus status);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device",
                                   "assignedTo"})
    List<Alert> findByDeviceId(Long deviceId);

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device",
                                   "assignedTo"})
    List<Alert> findByAssignedToId(Long userId);

    /** Deduplicación: evita crear una segunda alerta OPEN del mismo tipo para el mismo device. */
    boolean existsByDevice_IdAndAlertTypeAndStatus(
            Long deviceId,
            Alert.AlertType alertType,
            Alert.AlertStatus status);

    /** Auto-resolución: busca la alerta OPEN más reciente del mismo tipo para un device. */
    Optional<Alert> findTopByDevice_IdAndAlertTypeAndStatus(
            Long deviceId,
            Alert.AlertType alertType,
            Alert.AlertStatus status);
}
