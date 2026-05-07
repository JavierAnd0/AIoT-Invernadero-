package com.aiot.greenhouse.security;

import com.aiot.greenhouse.model.User;
import com.aiot.greenhouse.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Maneja el éxito de autenticación OAuth2 con Google.
 * Crea o actualiza el usuario en la BD y redirige al frontend con el JWT.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub");
        String avatarUrl = oAuth2User.getAttribute("picture");

        User user = userRepository.findByEmail(email).orElseGet(() ->
            userRepository.save(User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName(name != null ? name : email)
                .googleId(googleId)
                .authProvider("google")
                .avatarUrl(avatarUrl)
                .passwordHash("")
                .build())
        );

        if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user);
        String redirectUrl = frontendUrl + "/auth/callback?token=" + token;

        log.info("OAuth2 login exitoso para usuario: {}", email);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
