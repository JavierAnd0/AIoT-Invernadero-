package com.aiot.greenhouse.repository;

import com.aiot.greenhouse.model.Prediction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de acceso a datos para predicciones de IA. */
public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device"})
    List<Prediction> findAll();

    @EntityGraph(attributePaths = {"device", "device.zone", "device.registeredBy",
                                   "reading", "reading.device"})
    List<Prediction> findByDeviceIdOrderByCreatedAtDesc(Long deviceId);
}
