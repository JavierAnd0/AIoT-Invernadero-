package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.DeviceRequest;
import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.service.DeviceService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeviceController.class)
class DeviceControllerTest extends AbstractControllerTest {

    @MockBean
    private DeviceService deviceService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /devices?zone_id filtra dispositivos por zona")
    void getAll_withSnakeCaseZoneId_returnsDevicesByZone() throws Exception {
        Device device = Device.builder().id(1L).name("Sensor A").serialNumber("SNS-A").build();
        when(deviceService.findByZone(2L)).thenReturn(List.of(device));

        mockMvc.perform(get("/api/v1/devices").param("zone_id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].device_id").value(1))
                .andExpect(jsonPath("$[0].name").value("Sensor A"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /devices con ADMIN devuelve 201")
    void create_asAdmin_returns201() throws Exception {
        Device device = Device.builder().id(2L).name("Nodo 01").serialNumber("SNS-001").build();
        when(deviceService.create(any(DeviceRequest.class), any())).thenReturn(device);

        DeviceRequest req = new DeviceRequest();
        req.setZoneId(1L);
        req.setName("Nodo 01");

        mockMvc.perform(post("/api/v1/devices")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.device_id").value(2))
                .andExpect(jsonPath("$.name").value("Nodo 01"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("POST /devices con VIEWER devuelve 403")
    void create_asViewer_returns403() throws Exception {
        DeviceRequest req = new DeviceRequest();
        req.setZoneId(1L);
        req.setName("Nodo 02");

        mockMvc.perform(post("/api/v1/devices")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("PUT /devices/{id}/status actualiza estado a OFFLINE")
    void updateStatus_validStatus_returns200() throws Exception {
        Device device = Device.builder().id(1L).name("Sensor A")
                .status(Device.DeviceStatus.OFFLINE).build();
        when(deviceService.updateStatus(eq(1L), eq(Device.DeviceStatus.OFFLINE))).thenReturn(device);

        mockMvc.perform(put("/api/v1/devices/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OFFLINE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OFFLINE"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /devices/{id} no encontrado devuelve 404")
    void getById_notFound_returns404() throws Exception {
        when(deviceService.findById(99L))
                .thenThrow(new EntityNotFoundException("Device not found with ID: 99"));

        mockMvc.perform(get("/api/v1/devices/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /devices sin nombre devuelve 400")
    void create_missingName_returns400() throws Exception {
        DeviceRequest req = new DeviceRequest();
        req.setZoneId(1L);
        // name ausente → @NotBlank falla

        mockMvc.perform(post("/api/v1/devices")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.field_errors.name").exists());
    }
}
