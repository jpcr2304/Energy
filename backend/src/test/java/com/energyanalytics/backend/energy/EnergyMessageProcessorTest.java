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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class EnergyMessageProcessorTest {

  private static final Long DEVICE_ID = 7L;
  private static final DeviceType DEVICE_TYPE = DeviceType.SHELLY_EM_GEN3;

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
  @DisplayName("Instant power MQTT message is persisted for its device")
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

    boolean recognized = processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1:0",
        payload);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository).save(captor.capture());

    EnergyReading reading = captor.getValue();

    assertThat(reading.getDeviceId()).isEqualTo(DEVICE_ID);
    assertThat(reading.getTimestamp()).isNotNull();
    assertThat(reading.getChannelId()).isZero();
    assertThat(reading.getVoltage()).isEqualTo(230.5);
    assertThat(reading.getCurrent()).isEqualTo(2.1);
    assertThat(reading.getActivePower()).isEqualTo(483.8);
    assertThat(reading.getApparentPower()).isEqualTo(490.0);
    assertThat(reading.getPowerFactor()).isEqualTo(0.98);
    assertThat(reading.getFrequency()).isEqualTo(50.0);
    assertThat(reading.getTotalActEnergyKwh()).isNull();
    assertThat(recognized).isTrue();
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
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1data:0",
        payload);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository).save(captor.capture());

    EnergyReading reading = captor.getValue();

    assertThat(reading.getDeviceId()).isEqualTo(DEVICE_ID);
    assertThat(reading.getTimestamp()).isNotNull();
    assertThat(reading.getChannelId()).isZero();
    assertThat(reading.getTotalActEnergyKwh()).isEqualTo(12.5);
  }

  @Test
  @DisplayName("Generic MQTT RPC event persists readings from every available channel")
  void process_savesBothReadingsFromRpcEvent()
      throws Exception {

    String payload = """
        {
          "params": {
            "em1data:0": {
              "id": 0,
              "total_act_energy": 4200.0
            },
            "em1data:1": {
              "id": 1,
              "total_act_energy": 1800.0
            },
            "em1:0": {
              "voltage": 230.0,
              "current": 2.0,
              "act_power": 460.0,
              "aprt_power": 470.0,
              "pf": 0.97,
              "freq": 50.0
            },
            "em1:1": {
              "voltage": 230.0,
              "current": 0.5,
              "act_power": 120.0,
              "aprt_power": 125.0,
              "pf": 0.96,
              "freq": 50.0
            }
          }
        }
        """;

    processor.process(
        DEVICE_ID,
        DeviceType.MQTT,
        Set.of(0, 1),
        "shelly/events/rpc",
        payload);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository, times(2))
        .save(captor.capture());

    List<EnergyReading> readings = captor.getAllValues();
    EnergyReading accumulatedReading = readings.get(0);
    EnergyReading instantReading = readings.get(1);

    assertThat(accumulatedReading.getDeviceId())
        .isEqualTo(DEVICE_ID);
    assertThat(accumulatedReading.getTotalActEnergyKwh())
        .isEqualTo(6.0);
    assertThat(accumulatedReading.getChannelId()).isZero();

    assertThat(instantReading.getDeviceId())
        .isEqualTo(DEVICE_ID);
    assertThat(instantReading.getVoltage()).isEqualTo(230.0);
    assertThat(instantReading.getActivePower()).isEqualTo(580.0);
    assertThat(instantReading.getChannelId()).isZero();
  }

  @Test
  @DisplayName("Shelly RPC event is ignored to avoid duplicate status readings")
  void process_ignoresShellyRpcEvent() throws Exception {
    boolean recognized = processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/events/rpc",
        """
            {
              "params": {
                "em1:0": {
                  "id": 0,
                  "act_power": 460.0
                }
              }
            }
            """);

    verifyNoInteractions(energyReadingRepository);
    assertThat(recognized).isFalse();
  }

  @Test
  @DisplayName("Instant power is persisted at most once per 30-second bucket")
  void process_throttlesInstantPowerPerDeviceAndChannel()
      throws Exception {
    String payload = """
        {
          "id": 0,
          "act_power": 483.8
        }
        """;

    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1:0",
        payload);
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1:0",
        payload);

    verify(energyReadingRepository, times(1))
        .save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  @DisplayName("Accumulated energy is persisted at most once per minute bucket")
  void process_throttlesEnergyPerDeviceAndChannel()
      throws Exception {
    String payload = """
        {
          "id": 0,
          "total_act_energy": 12500.0
        }
        """;

    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1data:0",
        payload);
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1data:0",
        payload);

    verify(energyReadingRepository, times(1))
        .save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  @DisplayName("Selected channels are stored as one total reading")
  void process_aggregatesSelectedChannelsIntoOneReading()
      throws Exception {
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        Set.of(0, 1),
        "shelly/status/em1:0",
        """
            {
              "id": 0,
              "act_power": 483.8
            }
            """);
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        Set.of(0, 1),
        "shelly/status/em1:1",
        """
            {
              "id": 1,
              "act_power": 120.0
            }
            """);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository).save(captor.capture());

    EnergyReading totalReading = captor.getValue();

    assertThat(totalReading.getChannelId()).isZero();
    assertThat(totalReading.getActivePower()).isEqualTo(603.8);
  }

  @Test
  @DisplayName("Selected energy channels are stored as one accumulated total")
  void process_aggregatesSelectedEnergyChannels()
      throws Exception {
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        Set.of(0, 1),
        "shelly/status/em1data:0",
        """
            {
              "id": 0,
              "total_act_energy": 4200.0
            }
            """);
    processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        Set.of(0, 1),
        "shelly/status/em1data:1",
        """
            {
              "id": 1,
              "total_act_energy": 1800.0
            }
            """);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository).save(captor.capture());

    EnergyReading totalReading = captor.getValue();

    assertThat(totalReading.getChannelId()).isZero();
    assertThat(totalReading.getTotalActEnergyKwh())
        .isEqualTo(6.0);
  }

  @Test
  @DisplayName("Channels outside the home total are not persisted")
  void process_ignoresUnselectedChannels()
      throws Exception {
    boolean recognized = processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        Set.of(0),
        "shelly/status/em1:1",
        """
            {
              "id": 1,
              "act_power": 120.0
            }
            """);

    verifyNoInteractions(energyReadingRepository);
    assertThat(recognized).isTrue();
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
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1:0",
        payload);

    ArgumentCaptor<EnergyReading> captor = ArgumentCaptor.forClass(EnergyReading.class);

    verify(energyReadingRepository).save(captor.capture());

    EnergyReading reading = captor.getValue();

    assertThat(reading.getDeviceId()).isEqualTo(DEVICE_ID);
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
    boolean recognized = processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/unknown",
        "{}");

    verifyNoInteractions(energyReadingRepository);
    assertThat(recognized).isFalse();
  }

  @Test
  @DisplayName("Invalid JSON is rejected")
  void process_rejectsInvalidJson() {
    assertThatThrownBy(() -> processor.process(
        DEVICE_ID,
        DEVICE_TYPE,
        "shelly/status/em1:0",
        "{invalid-json"))
        .isInstanceOf(JsonProcessingException.class);

    verifyNoInteractions(energyReadingRepository);
  }
}
