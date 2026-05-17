package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.model.Device;
import com.aiot.greenhouse.service.DeviceService;
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
}
