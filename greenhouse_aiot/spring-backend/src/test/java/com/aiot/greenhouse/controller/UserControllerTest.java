package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.UserUpdateRequest;
import com.aiot.greenhouse.model.Role;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest extends AbstractControllerTest {

    @MockBean
    private UserService userService;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /users con ADMIN devuelve lista de usuarios")
    void getAll_asAdmin_returns200() throws Exception {
        User user = User.builder()
                .id(1L)
                .username("operador1")
                .email("op1@greenhouse.com")
                .role(Role.OPERATOR)
                .build();
        when(userService.findAll()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("operador1"))
                .andExpect(jsonPath("$[0].role").value("OPERATOR"));
    }

    @Test
    @WithMockUser(roles = "VIEWER")
    @DisplayName("GET /users con VIEWER devuelve 403")
    void getAll_asViewer_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    @DisplayName("GET /users con OPERATOR devuelve 403")
    void getAll_asOperator_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /users/{id} no encontrado devuelve 404")
    void getById_notFound_returns404() throws Exception {
        when(userService.findById(99L))
                .thenThrow(new EntityNotFoundException("User not found with ID: 99"));

        mockMvc.perform(get("/api/v1/users/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("PUT /users/{id} actualiza usuario correctamente")
    void update_asAdmin_returns200() throws Exception {
        User updated = User.builder()
                .id(1L)
                .username("op1")
                .email("op1@greenhouse.com")
                .fullName("Operador Actualizado")
                .role(Role.OPERATOR)
                .build();
        when(userService.update(anyLong(), any(UserUpdateRequest.class))).thenReturn(updated);

        UserUpdateRequest req = new UserUpdateRequest();
        req.setFullName("Operador Actualizado");

        mockMvc.perform(put("/api/v1/users/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.full_name").value("Operador Actualizado"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("DELETE /users/{id} desactiva usuario y devuelve 204")
    void deactivate_asAdmin_returns204() throws Exception {
        doNothing().when(userService).deactivate(anyLong());

        mockMvc.perform(delete("/api/v1/users/1").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
