package com.aiot.greenhouse.controller;

import com.aiot.greenhouse.security.JwtAuthenticationFilter;
import com.aiot.greenhouse.security.JwtTokenProvider;
import com.aiot.greenhouse.security.OAuth2AuthenticationSuccessHandler;
import com.aiot.greenhouse.security.SecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;

@Import({JwtTokenProvider.class, JwtAuthenticationFilter.class, SecurityConfig.class})
public abstract class AbstractControllerTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @MockBean
    protected UserDetailsService userDetailsService;

    @MockBean
    protected OAuth2AuthenticationSuccessHandler oauth2SuccessHandler;

    @MockBean
    protected ClientRegistrationRepository clientRegistrationRepository;
}
