package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Crop;
import com.aiot.greenhouse.service.CropService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CropController.class)
class CropControllerTest extends AbstractControllerTest {

    @MockBean
    private CropService cropService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /crops?zone_id filtra cultivos por zona")
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
}
