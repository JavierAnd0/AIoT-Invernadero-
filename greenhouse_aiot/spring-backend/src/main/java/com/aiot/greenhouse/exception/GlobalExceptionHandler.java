package com.aiot.greenhouse.exception;

import com.aiot.greenhouse.dto.response.ApiError;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Manejador global de excepciones que convierte errores en respuestas JSON estandarizadas.
 * Soporta internacionalización de mensajes de error via Accept-Language header.
 */
@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    /** Maneja errores de validación de campos (@Valid). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            fieldErrors.put(fieldName, message);
        });

        return ResponseEntity.badRequest().body(ApiError.builder()
                .status(400)
                .message(messageSource.getMessage("error.validation", null, LocaleContextHolder.getLocale()))
                .fieldErrors(fieldErrors)
                .build());
    }

    /** Maneja entidades no encontradas. */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.builder()
                .status(404)
                .message(ex.getMessage())
                .build());
    }

    /** Maneja credenciales inválidas en login. */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiError.builder()
                .status(401)
                .message(messageSource.getMessage("error.auth.invalidCredentials", null, LocaleContextHolder.getLocale()))
                .build());
    }

    /** Maneja acceso denegado por rol insuficiente. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.builder()
                .status(403)
                .message(messageSource.getMessage("error.auth.forbidden", null, LocaleContextHolder.getLocale()))
                .build());
    }

    /** Maneja errores de lógica de negocio. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiError.builder()
                .status(400)
                .message(ex.getMessage())
                .build());
    }

    /** Captura cualquier excepción no manejada. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneral(Exception ex) {
        log.error("Error no manejado: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiError.builder()
                .status(500)
                .message(messageSource.getMessage("error.internal", null, LocaleContextHolder.getLocale()))
                .build());
    }
}
