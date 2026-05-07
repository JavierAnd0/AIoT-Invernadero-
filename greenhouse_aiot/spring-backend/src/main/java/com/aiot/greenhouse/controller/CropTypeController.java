package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.dto.request.CropTypeRequest;
import com.aiot.greenhouse.model.CropType;
import com.aiot.greenhouse.service.CropTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para el catálogo de tipos de cultivo.
 */
@RestController
@RequestMapping("/api/v1/crop-types")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Tipos de Cultivo", description = "Catálogo de especies y sus condiciones óptimas")
public class CropTypeController {

    private final CropTypeService cropTypeService;

    /** Lista todos los tipos de cultivo registrados. */
    @GetMapping
    @Operation(summary = "Listar tipos de cultivo")
    public ResponseEntity<List<CropType>> getAll() {
        return ResponseEntity.ok(cropTypeService.findAll());
    }

    /** Obtiene un tipo de cultivo por su ID. */
    @GetMapping("/{id}")
    @Operation(summary = "Obtener tipo de cultivo por ID")
    public ResponseEntity<CropType> getById(@PathVariable Long id) {
        return ResponseEntity.ok(cropTypeService.findById(id));
    }

    /** Crea un nuevo tipo de cultivo. Solo ADMIN. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear tipo de cultivo")
    public ResponseEntity<CropType> create(@Valid @RequestBody CropTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cropTypeService.create(request));
    }

    /** Actualiza un tipo de cultivo existente. Solo ADMIN. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar tipo de cultivo")
    public ResponseEntity<CropType> update(@PathVariable Long id, @Valid @RequestBody CropTypeRequest request) {
        return ResponseEntity.ok(cropTypeService.update(id, request));
    }

    /** Elimina un tipo de cultivo del catálogo. Solo ADMIN. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar tipo de cultivo")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        cropTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
