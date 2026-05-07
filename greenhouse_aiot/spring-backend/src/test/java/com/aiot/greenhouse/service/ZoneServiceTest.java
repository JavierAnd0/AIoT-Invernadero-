package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.ZoneRequest;
import com.aiot.greenhouse.model.Zone;
import com.aiot.greenhouse.repository.ZoneRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios de ZoneService con Mockito.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ZoneService Tests")
class ZoneServiceTest {

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private ZoneService zoneService;

    private Zone testZone;

    @BeforeEach
    void setUp() {
        testZone = Zone.builder()
                .id(1L)
                .name("Zona A")
                .description("Zona de lechugas")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("findAll devuelve lista de zonas activas")
    void findAll_returnsActiveZones() {
        when(zoneRepository.findByIsActiveTrue()).thenReturn(List.of(testZone));

        List<Zone> result = zoneService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Zona A");
        verify(zoneRepository).findByIsActiveTrue();
    }

    @Test
    @DisplayName("findById devuelve zona cuando existe")
    void findById_existingId_returnsZone() {
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(testZone));

        Zone result = zoneService.findById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Zona A");
    }

    @Test
    @DisplayName("findById lanza EntityNotFoundException cuando no existe")
    void findById_nonExistingId_throwsException() {
        when(zoneRepository.findById(99L)).thenReturn(Optional.empty());
        when(messageSource.getMessage(any(), any(), any())).thenReturn("Zone not found");

        assertThatThrownBy(() -> zoneService.findById(99L))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("create guarda y devuelve nueva zona")
    void create_validRequest_savesAndReturnsZone() {
        ZoneRequest request = new ZoneRequest();
        request.setName("Zona B");
        request.setDescription("Nueva zona");

        when(zoneRepository.existsByName("Zona B")).thenReturn(false);
        when(zoneRepository.save(any(Zone.class))).thenReturn(
                Zone.builder().id(2L).name("Zona B").build());

        Zone result = zoneService.create(request);

        assertThat(result.getId()).isEqualTo(2L);
        verify(zoneRepository).save(any(Zone.class));
    }

    @Test
    @DisplayName("create lanza excepción si el nombre ya existe")
    void create_duplicateName_throwsException() {
        ZoneRequest request = new ZoneRequest();
        request.setName("Zona A");

        when(zoneRepository.existsByName("Zona A")).thenReturn(true);
        when(messageSource.getMessage(any(), any(), any())).thenReturn("Name taken");

        assertThatThrownBy(() -> zoneService.create(request))
                .isInstanceOf(IllegalArgumentException.class);

        verify(zoneRepository, never()).save(any());
    }

    @Test
    @DisplayName("deactivate pone isActive en false")
    void deactivate_existingZone_setsInactive() {
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(testZone));
        when(zoneRepository.save(any(Zone.class))).thenAnswer(inv -> inv.getArgument(0));

        zoneService.deactivate(1L);

        assertThat(testZone.isActive()).isFalse();
        verify(zoneRepository).save(testZone);
    }
}
