package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de acceso a datos para alertas del sistema. */
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatus(Alert.AlertStatus status);

    List<Alert> findByDeviceId(Long deviceId);

    List<Alert> findByAssignedToId(Long userId);
}
