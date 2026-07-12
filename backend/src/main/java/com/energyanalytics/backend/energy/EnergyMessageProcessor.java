package com.energyanalytics.backend.energy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class EnergyMessageProcessor {

    private final EnergyReadingRepository energyReadingRepository;
    private final ObjectMapper objectMapper;

    public void process(String topic, String payload)
            throws JsonProcessingException {

        JsonNode json = objectMapper.readTree(payload);

        if (topic.endsWith("/status/em1:0")) {
            saveInstantPowerReading(json);
            return;
        }

        if (topic.endsWith("/status/em1data:0")) {
            saveEnergyAccumulatedReading(json);
            return;
        }

        if (topic.endsWith("/events/rpc")) {
            saveFromRpcEvent(json);
        }
    }

    private void saveInstantPowerReading(JsonNode json) {
        EnergyReading reading = EnergyReading.builder()
                .timestamp(Instant.now())
                .channelId(json.path("id").asInt(0))
                .voltage(getDouble(json, "voltage"))
                .current(getDouble(json, "current"))
                .activePower(getDouble(json, "act_power"))
                .apparentPower(getDouble(json, "aprt_power"))
                .powerFactor(getDouble(json, "pf"))
                .frequency(getDouble(json, "freq"))
                .build();

        energyReadingRepository.save(reading);
    }

    private void saveEnergyAccumulatedReading(JsonNode json) {
        double totalActEnergyWh = json.path("total_act_energy").asDouble();

        EnergyReading reading = EnergyReading.builder()
                .timestamp(Instant.now())
                .channelId(json.path("id").asInt(0))
                .totalActEnergyKwh(totalActEnergyWh / 1000.0)
                .build();

        energyReadingRepository.save(reading);
    }

    private void saveFromRpcEvent(JsonNode json) {
        JsonNode params = json.path("params");

        JsonNode accumulatedData = params.path("em1data:0");

        if (!accumulatedData.isMissingNode()
                && accumulatedData.has("total_act_energy")) {
            saveEnergyAccumulatedReading(accumulatedData);
        }

        JsonNode instantData = params.path("em1:0");

        if (!instantData.isMissingNode()
                && instantData.has("act_power")) {

            EnergyReading reading = EnergyReading.builder()
                    .timestamp(Instant.now())
                    .channelId(0)
                    .voltage(getDouble(instantData, "voltage"))
                    .current(getDouble(instantData, "current"))
                    .activePower(getDouble(instantData, "act_power"))
                    .apparentPower(getDouble(instantData, "aprt_power"))
                    .powerFactor(getDouble(instantData, "pf"))
                    .frequency(getDouble(instantData, "freq"))
                    .build();

            energyReadingRepository.save(reading);
        }
    }

    private Double getDouble(JsonNode json, String field) {
        return json.has(field) && !json.get(field).isNull()
                ? json.get(field).asDouble()
                : null;
    }
}