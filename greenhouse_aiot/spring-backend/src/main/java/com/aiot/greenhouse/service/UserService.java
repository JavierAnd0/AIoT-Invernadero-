package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.UserUpdateRequest;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio para gestión de usuarios del sistema.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MessageSource messageSource;

    /**
     * Lista todos los usuarios del sistema.
     *
     * @return lista de usuarios
     */
    @Transactional(readOnly = true)
    public List<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * Obtiene un usuario por su ID.
     *
     * @param id identificador del usuario
     * @return usuario encontrado
     */
    @Transactional(readOnly = true)
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                    messageSource.getMessage("error.user.notFound", new Object[]{id}, LocaleContextHolder.getLocale())));
    }

    /**
     * Actualiza los datos de un usuario existente.
     *
     * @param id      ID del usuario
     * @param request nuevos datos del usuario
     * @return usuario actualizado
     */
    @Transactional
    public User update(Long id, UserUpdateRequest request) {
        User user = findById(id);
        if (request.getUsername() != null) user.setUsername(request.getUsername());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getRole() != null) user.setRole(request.getRole());
        if (request.getIsActive() != null) user.setActive(request.getIsActive());
        return userRepository.save(user);
    }

    /**
     * Desactiva un usuario (soft delete).
     *
     * @param id ID del usuario a desactivar
     */
    @Transactional
    public void deactivate(Long id) {
        User user = findById(id);
        user.setActive(false);
        userRepository.save(user);
    }
}
