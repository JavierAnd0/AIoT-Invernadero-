package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.CropRequest;
import com.aiot.greenhouse.model.Crop;
import com.aiot.greenhouse.service.CropService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CropController.class)
class CropControllerTest extends AbstractControllerTest {

    @MockBean
    private CropService cropService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /crops?zone_id filtra cultivos por zona (snake_case)")
    void getAll_withSnakeCaseZoneId_returnsCropsByZone() throws Exception {
        Crop crop = Crop.builder().id(1L).batchCode("TC-2026-001").quantity(100).build();
        when(cropService.findByZone(3L)).thenReturn(List.of(crop));

        mockMvc.perform(get("/api/v1/crops").param("zone_id", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].crop_id").value(1))
                .andExpect(jsonPath("$[0].batchCode").value("TC-2026-001"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /crops?zoneId mantiene compatibilidad camelCase")
    void getAll_withCamelCaseZoneId_returnsCropsByZone() throws Exception {
        Crop crop = Crop.builder().id(2L).batchCode("LB-2026-001").quantity(50).build();
        when(cropService.findByZone(4L)).thenReturn(List.of(crop));

        mockMvc.perform(get("/api/v1/crops").param("zoneId", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].crop_id").value(2))
                .andExpect(jsonPath("$[0].batchCode").value("LB-2026-001"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("POST /crops con OPERATOR devuelve 201")
    void create_asOperator_returns201() throws Exception {
        Crop crop = Crop.builder().id(3L).batchCode("NW-2026-001").quantity(200)
                .status(Crop.CropStatus.GERMINATING).build();
        when(cropService.create(any(CropRequest.class), any())).thenReturn(crop);

        CropRequest req = new CropRequest();
        req.setZoneId(1L);
        req.setCropTypeId(1L);
        req.setQuantity(200);
        req.setPlantedAt(LocalDate.now());

        mockMvc.perform(post("/api/v1/crops")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.crop_id").value(3))
                .andExpect(jsonPath("$.batchCode").value("NW-2026-001"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("POST /crops con VIEWER devuelve 403")
    void create_asViewer_returns403() throws Exception {
        CropRequest req = new CropRequest();
        req.setZoneId(1L);
        req.setCropTypeId(1L);
        req.setQuantity(100);
        req.setPlantedAt(LocalDate.now());

        mockMvc.perform(post("/api/v1/crops")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("PUT /crops/{id}/status actualiza estado del cultivo")
    void updateStatus_validStatus_returns200() throws Exception {
        Crop crop = Crop.builder().id(1L).status(Crop.CropStatus.HARVESTED).quantity(100).build();
        when(cropService.updateStatus(eq(1L), eq(Crop.CropStatus.HARVESTED))).thenReturn(crop);

        mockMvc.perform(put("/api/v1/crops/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"HARVESTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HARVESTED"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /crops/{id} no encontrado devuelve 404")
    void getById_notFound_returns404() throws Exception {
        when(cropService.findById(99L))
                .thenThrow(new EntityNotFoundException("Crop not found with ID: 99"));

        mockMvc.perform(get("/api/v1/crops/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
