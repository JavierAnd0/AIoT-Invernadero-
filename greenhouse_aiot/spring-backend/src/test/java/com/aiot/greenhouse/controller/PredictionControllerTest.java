package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Prediction;
import com.aiot.greenhouse.service.PredictionService;
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

@WebMvcTest(PredictionController.class)
class PredictionControllerTest extends AbstractControllerTest {

    @MockBean
    private PredictionService predictionService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /predictions devuelve historial completo")
    void getAll_authenticated_returns200() throws Exception {
        Prediction p = Prediction.builder()
                .id(1L)
                .predictedClass(Prediction.PredictedClass.OPTIMAL)
                .confidence(new BigDecimal("0.92"))
                .modelName("random_forest")
                .build();
        when(predictionService.findAll()).thenReturn(List.of(p));

        mockMvc.perform(get("/api/v1/predictions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].prediction_id").value(1))
                .andExpect(jsonPath("$[0].predicted_class").value("OPTIMAL"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /predictions?device_id filtra por dispositivo")
    void getAll_filteredByDevice_returns200() throws Exception {
        Prediction p = Prediction.builder()
                .id(2L)
                .predictedClass(Prediction.PredictedClass.WARNING)
                .confidence(new BigDecimal("0.75"))
                .build();
        when(predictionService.findByDevice(anyLong())).thenReturn(List.of(p));

        mockMvc.perform(get("/api/v1/predictions").param("device_id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].prediction_id").value(2))
                .andExpect(jsonPath("$[0].predicted_class").value("WARNING"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("POST /predictions/predict devuelve predicción exitosa")
    void predict_validBody_returns200() throws Exception {
        Prediction result = Prediction.builder()
                .id(10L)
                .predictedClass(Prediction.PredictedClass.OPTIMAL)
                .confidence(new BigDecimal("0.88"))
                .modelName("random_forest")
                .build();
        when(predictionService.predict(anyLong(), any(), anyMap(), anyString())).thenReturn(result);

        String body = """
                {
                  "device_id": 1,
                  "temperature": 22.5,
                  "humidity": 65.0,
                  "ph": 6.5,
                  "light_lux": 5000.0,
                  "co2_ppm": 400.0
                }
                """;

        mockMvc.perform(post("/api/v1/predictions/predict")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.predicted_class").value("OPTIMAL"))
                .andExpect(jsonPath("$.confidence").isNumber());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("POST /predictions/predict devuelve 503 cuando el servicio AI falla")
    void predict_serviceUnavailable_returns503() throws Exception {
        when(predictionService.predict(anyLong(), any(), anyMap(), anyString()))
                .thenThrow(new RuntimeException("AI script failed"));

        String body = """
                {
                  "device_id": 1,
                  "temperature": 22.5,
                  "humidity": 65.0,
                  "ph": 6.5,
                  "light_lux": 5000.0,
                  "co2_ppm": 400.0
                }
                """;

        mockMvc.perform(post("/api/v1/predictions/predict")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /predictions/device/{id} devuelve predicciones del dispositivo")
    void getByDevice_returns200() throws Exception {
        Prediction p = Prediction.builder()
                .id(3L)
                .predictedClass(Prediction.PredictedClass.CRITICAL)
                .confidence(new BigDecimal("0.95"))
                .build();
        when(predictionService.findByDevice(anyLong())).thenReturn(List.of(p));

        mockMvc.perform(get("/api/v1/predictions/device/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].predicted_class").value("CRITICAL"));
    }
}
