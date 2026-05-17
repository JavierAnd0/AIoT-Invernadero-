package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.CropTypeRequest;
import com.aiot.greenhouse.model.CropType;
import com.aiot.greenhouse.service.CropTypeService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CropTypeController.class)
class CropTypeControllerTest extends AbstractControllerTest {

    @MockBean
    private CropTypeService cropTypeService;

    @Test
    @DisplayName("GET /crop-types es público — devuelve 200 sin autenticación")
    void getAll_unauthenticated_returns200() throws Exception {
        CropType ct = CropType.builder()
                .id(1L)
                .name("Tomate")
                .scientificName("Solanum lycopersicum")
                .build();
        when(cropTypeService.findAll()).thenReturn(List.of(ct));

        mockMvc.perform(get("/api/v1/crop-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].crop_type_id").value(1))
                .andExpect(jsonPath("$[0].name").value("Tomate"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /crop-types con ADMIN devuelve 201")
    void create_asAdmin_returns201() throws Exception {
        CropType created = CropType.builder()
                .id(2L)
                .name("Lechuga")
                .tempOptimal(new BigDecimal("18.0"))
                .build();
        when(cropTypeService.create(any(CropTypeRequest.class))).thenReturn(created);

        CropTypeRequest req = new CropTypeRequest();
        req.setName("Lechuga");

        mockMvc.perform(post("/api/v1/crop-types")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.crop_type_id").value(2))
                .andExpect(jsonPath("$.name").value("Lechuga"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("POST /crop-types con VIEWER devuelve 403")
    void create_asViewer_returns403() throws Exception {
        CropTypeRequest req = new CropTypeRequest();
        req.setName("Pepino");

        mockMvc.perform(post("/api/v1/crop-types")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /crop-types sin nombre devuelve 400")
    void create_missingName_returns400() throws Exception {
        CropTypeRequest req = new CropTypeRequest();
        // name ausente → @NotBlank falla

        mockMvc.perform(post("/api/v1/crop-types")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("DELETE /crop-types/{id} devuelve 204")
    void delete_asAdmin_returns204() throws Exception {
        doNothing().when(cropTypeService).delete(anyLong());

        mockMvc.perform(delete("/api/v1/crop-types/1").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /crop-types/{id} no encontrado devuelve 404")
    void getById_notFound_returns404() throws Exception {
        when(cropTypeService.findById(99L))
                .thenThrow(new EntityNotFoundException("Crop type not found with ID: 99"));

        mockMvc.perform(get("/api/v1/crop-types/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
