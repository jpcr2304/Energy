package com.energyanalytics.backend.energy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EnergyReadingRepository extends JpaRepository<EnergyReading, Long> {

    List<EnergyReading> findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
            Instant start,
            Instant end);

    Optional<EnergyReading> findTopByOrderByTimestampDesc();
}