package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Alert;

import com.aiot.greenhouse.service.AlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del AlertController: listado, reconocimiento y resolución de alertas.
 */
@WebMvcTest(AlertController.class)
class AlertControllerTest extends AbstractControllerTest {

    @MockBean
    private AlertService alertService;

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("GET /alerts devuelve todas las alertas")
    void getAll_returns200() throws Exception {
        Alert alert = Alert.builder()
                .id(1L)
                .alertType(Alert.AlertType.TEMPERATURE)
                .severity(Alert.Severity.HIGH)
                .status(Alert.AlertStatus.OPEN)
                .message("Temperature too high")
                .build();
        when(alertService.findAll()).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/v1/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("OPEN"))
                .andExpect(jsonPath("$[0].severity").value("HIGH"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /alerts/open devuelve solo alertas abiertas")
    void getOpen_returnsOnlyOpenAlerts() throws Exception {
        Alert open = Alert.builder().id(1L).status(Alert.AlertStatus.OPEN).message("test").build();
        when(alertService.findOpen()).thenReturn(List.of(open));

        mockMvc.perform(get("/api/v1/alerts/open"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("PUT /alerts/{id}/acknowledge cambia estado a ACKNOWLEDGED")
    void acknowledge_returns200WithAcknowledgedStatus() throws Exception {
        Alert acked = Alert.builder().id(1L).status(Alert.AlertStatus.ACKNOWLEDGED).message("acked").build();
        when(alertService.acknowledge(1L)).thenReturn(acked);

        mockMvc.perform(put("/api/v1/alerts/1/acknowledge").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACKNOWLEDGED"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("PUT /alerts/{id}/resolve cambia estado a RESOLVED")
    void resolve_returns200WithResolvedStatus() throws Exception {
        Alert resolved = Alert.builder().id(1L).status(Alert.AlertStatus.RESOLVED).message("resolved").build();
        when(alertService.resolve(1L)).thenReturn(resolved);

        mockMvc.perform(put("/api/v1/alerts/1/resolve").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }
}
