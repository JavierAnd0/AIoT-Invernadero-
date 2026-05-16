package com.aiot.greenhouse.service;

import com.aiot.greenhouse.dto.request.LoginRequest;
import com.aiot.greenhouse.dto.request.RegisterRequest;
import com.aiot.greenhouse.dto.response.AuthResponse;
import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.UserRepository;
import com.aiot.greenhouse.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de autenticación: login, registro y consulta del perfil actual.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MessageSource messageSource;

    /**
     * Autentica un usuario con username/password y devuelve un JWT.
     *
     * @param request credenciales de acceso
     * @return respuesta con token JWT y datos del usuario
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // If this account was created via Google OAuth it has no password — tell the user to use Google sign-in.
        userRepository.findByUsername(request.getUsername())
                .or(() -> userRepository.findByEmail(request.getUsername()))
                .filter(u -> "google".equals(u.getAuthProvider()))
                .ifPresent(u -> { throw new AuthenticationServiceException("USE_GOOGLE_AUTH"); });

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        User user = (User) auth.getPrincipal();
        String token = jwtTokenProvider.generateToken(user);
        return buildAuthResponse(user, token);
    }

    /**
     * Registra un nuevo usuario en el sistema.
     *
     * @param request datos del nuevo usuario
     * @return respuesta con token JWT y datos del usuario creado
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException(
                messageSource.getMessage("error.username.taken", null, LocaleContextHolder.getLocale()));
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException(
                messageSource.getMessage("error.email.taken", null, LocaleContextHolder.getLocale()));
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .build();

        userRepository.save(user);
        String token = jwtTokenProvider.generateToken(user);
        return buildAuthResponse(user, token);
    }

    /**
     * Devuelve el perfil del usuario autenticado actualmente.
     *
     * @param user usuario autenticado inyectado por Spring Security
     * @return datos del usuario
     */
    public AuthResponse getMe(User user) {
        return buildAuthResponse(user, null);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}
