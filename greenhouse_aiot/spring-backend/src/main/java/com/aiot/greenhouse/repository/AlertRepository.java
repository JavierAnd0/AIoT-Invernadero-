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
}
