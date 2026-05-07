package com.aiot.greenhouse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada principal del sistema AIoT Greenhouse.
 * Backend REST en Spring Boot que gestiona zonas, dispositivos IoT,
 * cultivos, alertas y predicciones de IA.
 */
@SpringBootApplication
@EnableScheduling
public class GreenhouseApplication {

    public static void main(String[] args) {
        SpringApplication.run(GreenhouseApplication.class, args);
    }
}
