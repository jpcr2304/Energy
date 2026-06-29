package com.energyanalytics.backend.energy;

import java.time.Instant;

public record EnergyLatestResponse(
        Instant timestamp,
        Double voltage,
        Double current,
        Double activePower,
        Double totalActEnergyKwh) {
}