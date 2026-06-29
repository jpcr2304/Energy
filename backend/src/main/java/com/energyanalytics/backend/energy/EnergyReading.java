package com.energyanalytics.backend.energy;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant timestamp;

    private Integer channelId;

    private Double voltage;

    private Double current;

    private Double activePower;

    private Double apparentPower;

    private Double powerFactor;

    private Double frequency;

    private Double totalActEnergyKwh;
}