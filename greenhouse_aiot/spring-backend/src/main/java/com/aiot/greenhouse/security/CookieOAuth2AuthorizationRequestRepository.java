package com.aiot.greenhouse.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.util.SerializationUtils;

import java.util.Base64;

/**
 * Almacena la petición de autorización OAuth2 en una cookie HttpOnly en lugar
 * de en la sesión HTTP del servidor.
 *
 * Por qué es necesario:
 *   El frontend (Vercel) y el backend (DuckDNS) están en dominios distintos.
 *   Cuando el navegador sigue la cadena de redirecciones:
 *     Vercel → Backend → Google → Backend (callback)
 *   las cookies de sesión del backend NO se envían en el último paso porque
 *   el navegador las bloquea como cookies "cross-site" (SameSite=Lax por defecto).
 *   Al guardar el estado OAuth2 en una cookie propia del dominio del backend,
 *   ésta sí se envía de vuelta en el callback y Spring Security puede validar
 *   el parámetro `state`, evitando el error [authorization_request_not_found].
 */
@Slf4j
public class CookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE_NAME = "oauth2_auth_request";
    private static final int    COOKIE_MAX_AGE_SECONDS = 180; // 3 minutos

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return getCookieValue(request);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                         HttpServletRequest request,
                                         HttpServletResponse response) {
        if (authorizationRequest == null) {
            deleteCookie(request, response);
            return;
        }
        String serialized = serialize(authorizationRequest);
        Cookie cookie = new Cookie(COOKIE_NAME, serialized);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(COOKIE_MAX_AGE_SECONDS);
        cookie.setSecure(true);
        // SameSite=None es indispensable para cookies cross-site en flujos OAuth2
        response.addHeader("Set-Cookie",
                String.format("%s=%s; Path=/; Max-Age=%d; HttpOnly; Secure; SameSite=None",
                        COOKIE_NAME, serialized, COOKIE_MAX_AGE_SECONDS));
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                  HttpServletResponse response) {
        OAuth2AuthorizationRequest authRequest = loadAuthorizationRequest(request);
        deleteCookie(request, response);
        return authRequest;
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private OAuth2AuthorizationRequest getCookieValue(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                try {
                    return deserialize(cookie.getValue());
                } catch (Exception e) {
                    log.warn("Could not deserialize OAuth2 authorization request cookie: {}", e.getMessage());
                    return null;
                }
            }
        }
        return null;
    }

    private void deleteCookie(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                String.format("%s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None", COOKIE_NAME));
    }

    private String serialize(OAuth2AuthorizationRequest request) {
        return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(request));
    }

    @SuppressWarnings("unchecked")
    private OAuth2AuthorizationRequest deserialize(String value) {
        return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(
                Base64.getUrlDecoder().decode(value));
    }
}
