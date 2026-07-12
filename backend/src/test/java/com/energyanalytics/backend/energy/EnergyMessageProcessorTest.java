package com.energyanalytics.backend.energy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class EnergyMessageProcessorTest {

    @Mock
    private EnergyReadingRepository energyReadingRepository;

    private EnergyMessageProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new EnergyMessageProcessor(
                energyReadingRepository,
                new ObjectMapper());
    }

    @Test
    @DisplayName("Instant power MQTT message is persisted correctly")
    void process_savesInstantPowerReading() throws Exception {
        String payload = """
                {
                  "id": 0,
                  "voltage": 230.5,
                  "current": 2.1,
                  "act_power": 483.8,
                  "aprt_power": 490.0,
                  "pf": 0.98,
                  "freq": 50.0
                }
                """;

        processor.process(
                "shelly/status/em1:0",
                payload);

        ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

        verify(energyReadingRepository)
                .save(captor.capture());

        EnergyReading reading = captor.getValue();

        assertThat(reading.getTimestamp()).isNotNull();
        assertThat(reading.getChannelId()).isZero();
        assertThat(reading.getVoltage()).isEqualTo(230.5);
        assertThat(reading.getCurrent()).isEqualTo(2.1);
        assertThat(reading.getActivePower()).isEqualTo(483.8);
        assertThat(reading.getApparentPower()).isEqualTo(490.0);
        assertThat(reading.getPowerFactor()).isEqualTo(0.98);
        assertThat(reading.getFrequency()).isEqualTo(50.0);
        assertThat(reading.getTotalActEnergyKwh()).isNull();
    }

    @Test
    @DisplayName("Accumulated energy is converted from Wh to kWh")
    void process_convertsWhToKwh() throws Exception {
        String payload = """
                {
                  "id": 0,
                  "total_act_energy": 12500.0
                }
                """;

        processor.process(
                "shelly/status/em1data:0",
                payload);

        ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

        verify(energyReadingRepository)
                .save(captor.capture());

        EnergyReading reading = captor.getValue();

        assertThat(reading.getTimestamp()).isNotNull();
        assertThat(reading.getChannelId()).isZero();
        assertThat(reading.getTotalActEnergyKwh())
                .isEqualTo(12.5);
    }

    @Test
    @DisplayName("RPC event persists accumulated and instant readings")
    void process_savesBothReadingsFromRpcEvent()
            throws Exception {

        String payload = """
                {
                  "params": {
                    "em1data:0": {
                      "id": 0,
                      "total_act_energy": 4200.0
                    },
                    "em1:0": {
                      "voltage": 230.0,
                      "current": 2.0,
                      "act_power": 460.0,
                      "aprt_power": 470.0,
                      "pf": 0.97,
                      "freq": 50.0
                    }
                  }
                }
                """;

        processor.process(
                "shelly/events/rpc",
                payload);

        ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

        verify(energyReadingRepository, times(2))
                .save(captor.capture());

        List<EnergyReading> readings = captor.getAllValues();

        EnergyReading accumulatedReading = readings.get(0);
        EnergyReading instantReading = readings.get(1);

        assertThat(accumulatedReading.getTotalActEnergyKwh())
                .isEqualTo(4.2);

        assertThat(instantReading.getVoltage())
                .isEqualTo(230.0);

        assertThat(instantReading.getActivePower())
                .isEqualTo(460.0);
    }

    @Test
    @DisplayName("Missing optional fields are stored as null")
    void process_handlesMissingOptionalFields()
            throws Exception {

        String payload = """
                {
                  "id": 1,
                  "act_power": 420.0
                }
                """;

        processor.process(
                "shelly/status/em1:0",
                payload);

        ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

        verify(energyReadingRepository)
                .save(captor.capture());

        EnergyReading reading = captor.getValue();

        assertThat(reading.getChannelId()).isEqualTo(1);
        assertThat(reading.getActivePower()).isEqualTo(420.0);
        assertThat(reading.getVoltage()).isNull();
        assertThat(reading.getCurrent()).isNull();
        assertThat(reading.getPowerFactor()).isNull();
        assertThat(reading.getFrequency()).isNull();
    }

    @Test
    @DisplayName("Unknown MQTT topic does not persist data")
    void process_ignoresUnknownTopic() throws Exception {
        processor.process(
                "shelly/status/unknown",
                "{}");

        verifyNoInteractions(energyReadingRepository);
    }

    @Test
    @DisplayName("Invalid JSON is rejected")
    void process_rejectsInvalidJson() {
        assertThatThrownBy(() -> processor.process(
                "shelly/status/em1:0",
                "{invalid-json"))
                .isInstanceOf(JsonProcessingException.class);

        verifyNoInteractions(energyReadingRepository);
    }
}