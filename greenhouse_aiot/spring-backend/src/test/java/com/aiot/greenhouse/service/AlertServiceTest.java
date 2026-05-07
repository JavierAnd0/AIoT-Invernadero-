package com.aiot.greenhouse.service;

import com.aiot.greenhouse.model.Alert;
import com.aiot.greenhouse.repository.AlertRepository;
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
 * Tests unitarios de AlertService con Mockito.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AlertService Tests")
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private AlertService alertService;

    private Alert openAlert;

    @BeforeEach
    void setUp() {
        openAlert = Alert.builder()
                .id(1L)
                .alertType(Alert.AlertType.TEMPERATURE)
                .severity(Alert.Severity.HIGH)
                .status(Alert.AlertStatus.OPEN)
                .message("Temperature exceeded threshold")
                .build();
    }

    @Test
    @DisplayName("findOpen devuelve solo alertas con estado OPEN")
    void findOpen_returnsOnlyOpenAlerts() {
        when(alertRepository.findByStatus(Alert.AlertStatus.OPEN)).thenReturn(List.of(openAlert));

        List<Alert> result = alertService.findOpen();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(Alert.AlertStatus.OPEN);
    }

    @Test
    @DisplayName("acknowledge cambia estado a ACKNOWLEDGED")
    void acknowledge_changesStatusToAcknowledged() {
        when(alertRepository.findById(1L)).thenReturn(Optional.of(openAlert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        Alert result = alertService.acknowledge(1L);

        assertThat(result.getStatus()).isEqualTo(Alert.AlertStatus.ACKNOWLEDGED);
    }

    @Test
    @DisplayName("resolve cambia estado a RESOLVED y registra timestamp")
    void resolve_changesStatusToResolvedWithTimestamp() {
        when(alertRepository.findById(1L)).thenReturn(Optional.of(openAlert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        Alert result = alertService.resolve(1L);

        assertThat(result.getStatus()).isEqualTo(Alert.AlertStatus.RESOLVED);
        assertThat(result.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("dismiss cambia estado a DISMISSED")
    void dismiss_changesStatusToDismissed() {
        when(alertRepository.findById(1L)).thenReturn(Optional.of(openAlert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));

        Alert result = alertService.dismiss(1L);

        assertThat(result.getStatus()).isEqualTo(Alert.AlertStatus.DISMISSED);
    }
}
