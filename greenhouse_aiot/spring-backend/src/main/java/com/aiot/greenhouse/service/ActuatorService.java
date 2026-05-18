package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.ActuatorCommand;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.ActuatorCommandRepository;
import com.aiot.greenhouse.repository.DeviceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Servicio de control de actuadores IoT del invernadero.
 *
 * Un actuador es un dispositivo con DeviceType=ACTUATOR (ventilador, bomba de riego, luces UV).
 * Los comandos se registran en la tabla actuator_commands. En modo simulado, los comandos
 * se marcan como EXECUTED inmediatamente al guardarse.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActuatorService {

    private final DeviceRepository          deviceRepository;
    private final ActuatorCommandRepository commandRepository;

    /**
     * Lista todos los dispositivos de tipo ACTUATOR registrados en el sistema.
     *
     * @return lista de actuadores
     */
    @Transactional(readOnly = true)
    public List<Device> findActuators() {
        return deviceRepository.findAll().stream()
                .filter(d -> d.getDeviceType() == Device.DeviceType.ACTUATOR)
                .toList();
    }

    /**
     * Historial de comandos emitidos a un actuador, ordenados por fecha descendente.
     *
     * @param deviceId ID del dispositivo actuador
     * @return lista de comandos
     */
    @Transactional(readOnly = true)
    public List<ActuatorCommand> getHistory(Long deviceId) {
        return commandRepository.findByDeviceIdOrderByIssuedAtDesc(deviceId);
    }

    /**
     * Estado actual de un actuador: el último comando emitido.
     *
     * @param deviceId ID del dispositivo actuador
     * @return comando más reciente, o vacío si no hay historial
     */
    @Transactional(readOnly = true)
    public Optional<ActuatorCommand> getCurrentState(Long deviceId) {
        return commandRepository.findTopByDeviceIdOrderByIssuedAtDesc(deviceId);
    }

    /**
     * Emite un comando a un dispositivo actuador.
     * Los dispositivos simulados se marcan como EXECUTED inmediatamente.
     *
     * @param deviceId    ID del dispositivo actuador
     * @param commandType tipo de comando a ejecutar
     * @param issuedBy    usuario que emite el comando
     * @return comando guardado
     * @throws EntityNotFoundException  si el device no existe
     * @throws IllegalArgumentException si el device no es de tipo ACTUATOR
     */
    @Transactional
    public ActuatorCommand issueCommand(Long deviceId,
                                        ActuatorCommand.CommandType commandType,
                                        User issuedBy) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Dispositivo no encontrado: " + deviceId));

        if (device.getDeviceType() != Device.DeviceType.ACTUATOR) {
            throw new IllegalArgumentException(
                    "El dispositivo " + deviceId + " no es de tipo ACTUATOR");
        }

        ActuatorCommand cmd = ActuatorCommand.builder()
                .device(device)
                .issuedBy(issuedBy)
                .commandType(commandType)
                .status(ActuatorCommand.CommandStatus.EXECUTED)
                .executedAt(LocalDateTime.now())
                .build();

        ActuatorCommand saved = commandRepository.save(cmd);
        log.info("Actuator: {} → {} emitido por {} (device {})",
                commandType, saved.getStatus(),
                issuedBy != null ? issuedBy.getUsername() : "system",
                deviceId);
        return saved;
    }
}
