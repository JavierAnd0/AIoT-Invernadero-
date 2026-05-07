package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.ZoneRequest;
import com.aiot.greenhouse.model.Zone;
import com.aiot.greenhouse.service.ZoneService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests del ZoneController: CRUD de zonas con verificación de roles.
 */
@WebMvcTest(ZoneController.class)
@DisplayName("ZoneController Tests")
class ZoneControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ZoneService zoneService;

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /zones devuelve lista de zonas para cualquier usuario autenticado")
    void getAll_authenticatedUser_returns200() throws Exception {
        Zone zone = Zone.builder().id(1L).name("Zona A").isActive(true).build();
        when(zoneService.findAll()).thenReturn(List.of(zone));

        mockMvc.perform(get("/api/v1/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Zona A"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /zones con ADMIN devuelve 201")
    void create_asAdmin_returns201() throws Exception {
        Zone zone = Zone.builder().id(1L).name("Zona B").isActive(true).build();
        when(zoneService.create(any(ZoneRequest.class))).thenReturn(zone);

        ZoneRequest request = new ZoneRequest();
        request.setName("Zona B");

        mockMvc.perform(post("/api/v1/zones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Zona B"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("POST /zones con VIEWER devuelve 403")
    void create_asViewer_returns403() throws Exception {
        ZoneRequest request = new ZoneRequest();
        request.setName("Zona B");

        mockMvc.perform(post("/api/v1/zones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /zones/{id} no encontrado devuelve 404")
    void getById_notFound_returns404() throws Exception {
        when(zoneService.findById(99L)).thenThrow(new EntityNotFoundException("Zone not found with ID: 99"));

        mockMvc.perform(get("/api/v1/zones/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("GET /zones sin autenticación devuelve 401")
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/zones"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /zones sin nombre devuelve 400")
    void create_missingName_returns400() throws Exception {
        ZoneRequest request = new ZoneRequest();

        mockMvc.perform(post("/api/v1/zones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }
}
