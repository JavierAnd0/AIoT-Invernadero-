package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de acceso a datos para dispositivos IoT. */
public interface DeviceRepository extends JpaRepository<Device, Long> {

    List<Device> findByZoneId(Long zoneId);

    List<Device> findByStatus(Device.DeviceStatus status);
}
