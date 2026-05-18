package com.aiot.greenhouse.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Resultado de inferencia del modelo de IA, almacenado para trazabilidad y análisis.
 */
@Entity
@Table(name = "predictions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prediction_id")
    @JsonProperty("prediction_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "registeredBy", "zone"})
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reading_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "device"})
    private SensorReading reading;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 20)
    @Builder.Default
    private String modelVersion = "1.0";

    @Enumerated(EnumType.STRING)
    @Column(name = "predicted_class", nullable = false, length = 10)
    @JsonProperty("predicted_class")
    private PredictedClass predictedClass;

    @Column(name = "confidence", precision = 5, scale = 4)
    private BigDecimal confidence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_probabilities", columnDefinition = "jsonb")
    private Map<String, Double> rawProbabilities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_features", columnDefinition = "jsonb")
    private Map<String, Object> inputFeatures;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Clasificación de condición del cultivo. */
    public enum PredictedClass {
        OPTIMAL, WARNING, CRITICAL
    }
}
