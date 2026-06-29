package com.energyanalytics.backend.energy;

import java.time.Instant;

public record EnergyPointResponse(
        Instant timestamp,
        double accumulated) {
}