package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.SensorReadingRequest;
import com.aiot.greenhouse.model.SensorReading;
import com.aiot.greenhouse.service.SensorReadingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SensorReadingController.class)
class SensorReadingControllerTest extends AbstractControllerTest {

    @MockBean
    private SensorReadingService readingService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /readings devuelve lista de lecturas recientes")
    void getAll_authenticated_returns200() throws Exception {
        SensorReading reading = SensorReading.builder()
                .id(1L)
                .temperature(new BigDecimal("22.50"))
                .humidity(new BigDecimal("65.30"))
                .build();
        when(readingService.findAll(anyInt())).thenReturn(List.of(reading));

        mockMvc.perform(get("/api/v1/readings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reading_id").value(1))
                .andExpect(jsonPath("$[0].temperature").value(22.50));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /readings?device_id filtra por dispositivo")
    void getAll_filteredByDevice_returns200() throws Exception {
        SensorReading reading = SensorReading.builder()
                .id(2L)
                .temperature(new BigDecimal("24.00"))
                .build();
        when(readingService.findByDevice(anyLong(), anyInt())).thenReturn(List.of(reading));

        mockMvc.perform(get("/api/v1/readings").param("device_id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reading_id").value(2));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /readings/latest devuelve la lectura más reciente")
    void getLatest_returns200() throws Exception {
        SensorReading latest = SensorReading.builder()
                .id(5L)
                .temperature(new BigDecimal("23.10"))
                .humidity(new BigDecimal("70.00"))
                .build();
        when(readingService.findLatest()).thenReturn(latest);

        mockMvc.perform(get("/api/v1/readings/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reading_id").value(5))
                .andExpect(jsonPath("$.temperature").value(23.10));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("POST /readings registra nueva lectura y devuelve 201")
    void create_validRequest_returns201() throws Exception {
        SensorReading saved = SensorReading.builder()
                .id(10L)
                .temperature(new BigDecimal("21.00"))
                .humidity(new BigDecimal("68.00"))
                .build();
        when(readingService.create(any(SensorReadingRequest.class))).thenReturn(saved);

        String body = """
                {
                  "device_id": 1,
                  "temperature": 21.00,
                  "humidity": 68.00,
                  "ph": 6.5,
                  "light_lux": 4000.00,
                  "co2_ppm": 420.00
                }
                """;

        mockMvc.perform(post("/api/v1/readings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reading_id").value(10));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("POST /readings sin device_id devuelve 400")
    void create_missingDeviceId_returns400() throws Exception {
        String body = """
                {
                  "temperature": 21.00,
                  "humidity": 68.00
                }
                """;

        mockMvc.perform(post("/api/v1/readings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.field_errors.deviceId").exists());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /readings/device/{id} devuelve lecturas del dispositivo")
    void getByDevice_returns200() throws Exception {
        SensorReading reading = SensorReading.builder()
                .id(3L)
                .temperature(new BigDecimal("20.00"))
                .build();
        when(readingService.findByDevice(anyLong(), anyInt())).thenReturn(List.of(reading));

        mockMvc.perform(get("/api/v1/readings/device/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reading_id").value(3));
    }
}
