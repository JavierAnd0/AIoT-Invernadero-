package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.ActuatorCommand;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repositorio de comandos emitidos a actuadores IoT. */
public interface ActuatorCommandRepository extends JpaRepository<ActuatorCommand, Long> {

    @EntityGraph(attributePaths = {"device", "device.zone", "issuedBy"})
    List<ActuatorCommand> findByDeviceIdOrderByIssuedAtDesc(Long deviceId);

    /** Estado actual de un actuador: el comando más reciente emitido. */
    @EntityGraph(attributePaths = {"device", "device.zone", "issuedBy"})
    Optional<ActuatorCommand> findTopByDeviceIdOrderByIssuedAtDesc(Long deviceId);
}
