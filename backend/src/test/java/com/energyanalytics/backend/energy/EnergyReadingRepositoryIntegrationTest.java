package com.energyanalytics.backend.energy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class EnergyReadingRepositoryIntegrationTest {

    @SuppressWarnings("resource")
    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("energy_test")
            .withUsername("test")
            .withPassword("test");

    @Autowired
    private EnergyReadingRepository energyReadingRepository;

    @Test
    @DisplayName("Energy readings are filtered by date and ordered by timestamp")
    void findByTimestampBetween_returnsFilteredAndOrderedReadings() {
        Instant start = Instant.parse("2026-07-01T00:00:00Z");
        Instant end = Instant.parse("2026-07-02T00:00:00Z");

        EnergyReading outsideRange = EnergyReading.builder()
                .timestamp(Instant.parse("2026-06-30T23:00:00Z"))
                .totalActEnergyKwh(9.0)
                .build();

        EnergyReading secondReading = EnergyReading.builder()
                .timestamp(Instant.parse("2026-07-01T12:00:00Z"))
                .totalActEnergyKwh(12.0)
                .build();

        EnergyReading firstReading = EnergyReading.builder()
                .timestamp(Instant.parse("2026-07-01T10:00:00Z"))
                .totalActEnergyKwh(10.0)
                .build();

        EnergyReading readingWithoutAccumulatedEnergy = EnergyReading.builder()
                .timestamp(Instant.parse("2026-07-01T11:00:00Z"))
                .activePower(450.0)
                .totalActEnergyKwh(null)
                .build();

        energyReadingRepository.saveAllAndFlush(List.of(
                outsideRange,
                secondReading,
                firstReading,
                readingWithoutAccumulatedEnergy));

        List<EnergyReading> result = energyReadingRepository
                .findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                        start,
                        end);

        assertThat(result).hasSize(2);

        assertThat(result)
                .extracting(EnergyReading::getTimestamp)
                .containsExactly(
                        Instant.parse("2026-07-01T10:00:00Z"),
                        Instant.parse("2026-07-01T12:00:00Z"));

        assertThat(result)
                .extracting(EnergyReading::getTotalActEnergyKwh)
                .containsExactly(10.0, 12.0);
    }

    @Test
    @DisplayName("The most recent energy reading is returned")
    void findTopByOrderByTimestampDesc_returnsLatestReading() {
        EnergyReading olderReading = EnergyReading.builder()
                .timestamp(Instant.parse("2026-07-12T10:00:00Z"))
                .voltage(229.0)
                .activePower(300.0)
                .build();

        EnergyReading latestReading = EnergyReading.builder()
                .timestamp(Instant.parse("2026-07-12T12:00:00Z"))
                .voltage(231.0)
                .current(2.5)
                .activePower(577.5)
                .build();

        energyReadingRepository.saveAllAndFlush(
                List.of(olderReading, latestReading));

        Optional<EnergyReading> result = energyReadingRepository.findTopByOrderByTimestampDesc();

        assertThat(result).isPresent();
        assertThat(result.get().getTimestamp())
                .isEqualTo(Instant.parse("2026-07-12T12:00:00Z"));
        assertThat(result.get().getVoltage()).isEqualTo(231.0);
        assertThat(result.get().getCurrent()).isEqualTo(2.5);
        assertThat(result.get().getActivePower()).isEqualTo(577.5);
    }
}