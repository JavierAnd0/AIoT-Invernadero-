package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Device;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Repositorio de acceso a datos para dispositivos IoT. */
public interface DeviceRepository extends JpaRepository<Device, Long> {

    @EntityGraph(attributePaths = {"zone", "registeredBy"})
    List<Device> findAll();

    @EntityGraph(attributePaths = {"zone", "registeredBy"})
    Optional<Device> findById(Long id);

    @EntityGraph(attributePaths = {"zone", "registeredBy"})
    List<Device> findByZoneId(Long zoneId);

    @EntityGraph(attributePaths = {"zone", "registeredBy"})
    List<Device> findByStatus(Device.DeviceStatus status);
}
