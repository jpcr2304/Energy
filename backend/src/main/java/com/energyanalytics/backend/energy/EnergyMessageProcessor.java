package com.energyanalytics.backend.energy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class EnergyMessageProcessor {

        private static final int TOTAL_CHANNEL_ID = 0;
        private static final long POWER_WRITE_INTERVAL_SECONDS = 30;
        private static final long ENERGY_WRITE_INTERVAL_SECONDS = 60;

        private final EnergyReadingRepository energyReadingRepository;
        private final ObjectMapper objectMapper;

        private final Map<ReadingKey, Long> lastPersistedBucket = new ConcurrentHashMap<>();
        private final Map<ReadingKey, PowerSnapshot> latestPowerByChannel = new ConcurrentHashMap<>();
        private final Map<ReadingKey, Double> latestEnergyKwhByChannel = new ConcurrentHashMap<>();
        private final Map<ReadingKey, Long> latestEnergyBucketByChannel = new ConcurrentHashMap<>();

        public boolean process(
                        Long deviceId,
                        DeviceType deviceType,
                        String topic,
                        String payload) throws JsonProcessingException {
                return process(
                                deviceId,
                                deviceType,
                                Set.of(0),
                                topic,
                                payload);
        }

        public boolean process(
                        Long deviceId,
                        DeviceType deviceType,
                        Set<Integer> configuredTotalChannels,
                        String topic,
                        String payload) throws JsonProcessingException {

                JsonNode json = objectMapper.readTree(payload);
                Set<Integer> totalChannels = normalizeChannels(
                                configuredTotalChannels);

                if (topic.endsWith("/events/rpc")) {
                        if (deviceType == DeviceType.MQTT) {
                                saveFromRpcEvent(
                                                deviceId,
                                                json,
                                                totalChannels);
                                return true;
                        }

                        return false;
                }

                if (topic.contains("/status/em1data:")) {
                        saveSinglePhaseEnergy(
                                        deviceId,
                                        channelFromTopic(topic, json),
                                        json,
                                        "total_act_energy",
                                        totalChannels);
                        return true;
                }

                if (topic.contains("/status/em1:")) {
                        saveSinglePhasePower(
                                        deviceId,
                                        channelFromTopic(topic, json),
                                        json,
                                        totalChannels);
                        return true;
                }

                if (topic.contains("/status/emdata:")) {
                        saveThreePhaseEnergy(deviceId, json, "total_act");
                        return true;
                }

                if (topic.contains("/status/em:")) {
                        saveThreePhasePower(deviceId, json);
                        return true;
                }

                if (deviceType == DeviceType.MQTT) {
                        return saveGenericReading(
                                        deviceId,
                                        json,
                                        totalChannels);
                }

                return false;
        }

        public void resetDevice(Long deviceId) {
                lastPersistedBucket.keySet()
                                .removeIf(key -> key.deviceId().equals(deviceId));
                latestPowerByChannel.keySet()
                                .removeIf(key -> key.deviceId().equals(deviceId));
                latestEnergyKwhByChannel.keySet()
                                .removeIf(key -> key.deviceId().equals(deviceId));
                latestEnergyBucketByChannel.keySet()
                                .removeIf(key -> key.deviceId().equals(deviceId));
        }

        private void saveFromRpcEvent(
                        Long deviceId,
                        JsonNode json,
                        Set<Integer> totalChannels) {

                JsonNode params = json.path("params");

                for (int channelId = 0; channelId < 32; channelId++) {
                        JsonNode energyComponent = params.path(
                                        "em1data:" + channelId);

                        if (!energyComponent.isMissingNode()
                                        && !energyComponent.isNull()) {
                                saveSinglePhaseEnergy(
                                                deviceId,
                                                channelId,
                                                energyComponent,
                                                "total_act_energy",
                                                totalChannels);
                        }

                        JsonNode powerComponent = params.path(
                                        "em1:" + channelId);

                        if (!powerComponent.isMissingNode()
                                        && !powerComponent.isNull()) {
                                saveSinglePhasePower(
                                                deviceId,
                                                channelId,
                                                powerComponent,
                                                totalChannels);
                        }
                }

                JsonNode energyComponent = params.path("emdata:0");

                if (!energyComponent.isMissingNode()
                                && !energyComponent.isNull()) {
                        saveThreePhaseEnergy(
                                        deviceId,
                                        energyComponent,
                                        "total_act");
                }

                JsonNode powerComponent = params.path("em:0");

                if (!powerComponent.isMissingNode()
                                && !powerComponent.isNull()) {
                        saveThreePhasePower(deviceId, powerComponent);
                }
        }

        private void saveSinglePhasePower(
                        Long deviceId,
                        int sourceChannelId,
                        JsonNode json,
                        Set<Integer> totalChannels) {

                if (!totalChannels.contains(sourceChannelId)) {
                        return;
                }

                PowerSnapshot incoming = new PowerSnapshot(
                                getDouble(json, "voltage"),
                                getDouble(json, "current"),
                                getDouble(json, "act_power"),
                                getDouble(json, "aprt_power"),
                                getDouble(json, "pf"),
                                getDouble(json, "freq"));

                saveAggregatedPower(
                                deviceId,
                                sourceChannelId,
                                incoming,
                                totalChannels,
                                ReadingKind.SINGLE_PHASE_POWER);
        }

        private void saveThreePhasePower(
                        Long deviceId,
                        JsonNode json) {

                PowerSnapshot total = new PowerSnapshot(
                                average(
                                                getDouble(json, "a_voltage"),
                                                getDouble(json, "b_voltage"),
                                                getDouble(json, "c_voltage")),
                                firstPresent(
                                                getDouble(json, "total_current"),
                                                sum(
                                                                getDouble(json, "a_current"),
                                                                getDouble(json, "b_current"),
                                                                getDouble(json, "c_current"))),
                                firstPresent(
                                                getDouble(json, "total_act_power"),
                                                sum(
                                                                getDouble(json, "a_act_power"),
                                                                getDouble(json, "b_act_power"),
                                                                getDouble(json, "c_act_power"))),
                                firstPresent(
                                                getDouble(json, "total_aprt_power"),
                                                sum(
                                                                getDouble(json, "a_aprt_power"),
                                                                getDouble(json, "b_aprt_power"),
                                                                getDouble(json, "c_aprt_power"))),
                                average(
                                                getDouble(json, "a_pf"),
                                                getDouble(json, "b_pf"),
                                                getDouble(json, "c_pf")),
                                average(
                                                getDouble(json, "a_freq"),
                                                getDouble(json, "b_freq"),
                                                getDouble(json, "c_freq")));

                persistTotalPower(
                                deviceId,
                                total,
                                ReadingKind.THREE_PHASE_POWER);
        }

        private void saveGenericPower(
                        Long deviceId,
                        int sourceChannelId,
                        JsonNode json,
                        Set<Integer> totalChannels) {

                if (!totalChannels.contains(sourceChannelId)) {
                        return;
                }

                PowerSnapshot incoming = new PowerSnapshot(
                                firstPresent(
                                                getDouble(json, "voltage"),
                                                getDouble(json, "voltageV")),
                                firstPresent(
                                                getDouble(json, "current"),
                                                getDouble(json, "currentA")),
                                firstPresent(
                                                getDouble(json, "activePower"),
                                                getDouble(json, "active_power"),
                                                getDouble(json, "act_power")),
                                firstPresent(
                                                getDouble(json, "apparentPower"),
                                                getDouble(json, "apparent_power"),
                                                getDouble(json, "aprt_power")),
                                firstPresent(
                                                getDouble(json, "powerFactor"),
                                                getDouble(json, "power_factor"),
                                                getDouble(json, "pf")),
                                firstPresent(
                                                getDouble(json, "frequency"),
                                                getDouble(json, "freq")));

                saveAggregatedPower(
                                deviceId,
                                sourceChannelId,
                                incoming,
                                totalChannels,
                                ReadingKind.SINGLE_PHASE_POWER);
        }

        private void saveAggregatedPower(
                        Long deviceId,
                        int sourceChannelId,
                        PowerSnapshot incoming,
                        Set<Integer> totalChannels,
                        ReadingKind kind) {

                ReadingKey sourceKey = new ReadingKey(
                                deviceId,
                                sourceChannelId,
                                kind);

                latestPowerByChannel.merge(
                                sourceKey,
                                incoming,
                                PowerSnapshot::merge);

                List<PowerSnapshot> selectedSnapshots = new ArrayList<>();

                for (Integer channelId : totalChannels) {
                        PowerSnapshot snapshot = latestPowerByChannel.get(
                                        new ReadingKey(
                                                        deviceId,
                                                        channelId,
                                                        kind));

                        if (snapshot == null
                                        || snapshot.activePower() == null) {
                                return;
                        }

                        selectedSnapshots.add(snapshot);
                }

                persistTotalPower(
                                deviceId,
                                aggregatePower(selectedSnapshots),
                                kind);
        }

        private void persistTotalPower(
                        Long deviceId,
                        PowerSnapshot total,
                        ReadingKind kind) {

                if (total.activePower() == null) {
                        return;
                }

                Instant timestamp = Instant.now();

                if (!shouldPersist(
                                deviceId,
                                TOTAL_CHANNEL_ID,
                                kind,
                                timestamp)) {
                        return;
                }

                EnergyReading reading = EnergyReading.builder()
                                .deviceId(deviceId)
                                .timestamp(timestamp)
                                .channelId(TOTAL_CHANNEL_ID)
                                .voltage(total.voltage())
                                .current(total.current())
                                .activePower(total.activePower())
                                .apparentPower(total.apparentPower())
                                .powerFactor(total.powerFactor())
                                .frequency(total.frequency())
                                .build();

                energyReadingRepository.save(reading);
        }

        private void saveSinglePhaseEnergy(
                        Long deviceId,
                        int sourceChannelId,
                        JsonNode json,
                        String field,
                        Set<Integer> totalChannels) {

                Double energyWh = getDouble(json, field);

                if (energyWh == null
                                || !totalChannels.contains(sourceChannelId)) {
                        return;
                }

                saveAggregatedEnergy(
                                deviceId,
                                sourceChannelId,
                                energyWh / 1000.0,
                                totalChannels,
                                ReadingKind.SINGLE_PHASE_ENERGY);
        }

        private void saveThreePhaseEnergy(
                        Long deviceId,
                        JsonNode json,
                        String field) {

                Double energyWh = getDouble(json, field);

                if (energyWh == null) {
                        return;
                }

                persistTotalEnergy(
                                deviceId,
                                energyWh / 1000.0,
                                ReadingKind.THREE_PHASE_ENERGY,
                                Instant.now());
        }

        private void saveAggregatedEnergy(
                        Long deviceId,
                        int sourceChannelId,
                        double accumulatedKwh,
                        Set<Integer> totalChannels,
                        ReadingKind kind) {

                Instant timestamp = Instant.now();
                long currentBucket = timestamp.getEpochSecond()
                                / ENERGY_WRITE_INTERVAL_SECONDS;
                ReadingKey sourceKey = new ReadingKey(
                                deviceId,
                                sourceChannelId,
                                kind);

                latestEnergyKwhByChannel.put(sourceKey, accumulatedKwh);
                latestEnergyBucketByChannel.put(sourceKey, currentBucket);

                double totalKwh = 0;

                for (Integer channelId : totalChannels) {
                        ReadingKey channelKey = new ReadingKey(
                                        deviceId,
                                        channelId,
                                        kind);
                        Double channelKwh = latestEnergyKwhByChannel.get(channelKey);
                        Long channelBucket = latestEnergyBucketByChannel.get(channelKey);

                        if (channelKwh == null
                                        || channelBucket == null
                                        || channelBucket != currentBucket) {
                                return;
                        }

                        totalKwh += channelKwh;
                }

                persistTotalEnergy(
                                deviceId,
                                totalKwh,
                                kind,
                                timestamp);
        }

        private void persistTotalEnergy(
                        Long deviceId,
                        double totalKwh,
                        ReadingKind kind,
                        Instant timestamp) {

                if (!shouldPersist(
                                deviceId,
                                TOTAL_CHANNEL_ID,
                                kind,
                                timestamp)) {
                        return;
                }

                EnergyReading reading = EnergyReading.builder()
                                .deviceId(deviceId)
                                .timestamp(timestamp)
                                .channelId(TOTAL_CHANNEL_ID)
                                .totalActEnergyKwh(totalKwh)
                                .build();

                energyReadingRepository.save(reading);
        }

        private boolean saveGenericReading(
                        Long deviceId,
                        JsonNode json,
                        Set<Integer> totalChannels) {

                int channelId = json.path("channelId").asInt(
                                json.path("id").asInt(0));
                Double accumulatedKwh = firstPresent(
                                getDouble(json, "accumulatedKwh"),
                                getDouble(json, "accumulated_kwh"));

                if (accumulatedKwh != null) {
                        if (totalChannels.contains(channelId)) {
                                saveAggregatedEnergy(
                                                deviceId,
                                                channelId,
                                                accumulatedKwh,
                                                totalChannels,
                                                ReadingKind.SINGLE_PHASE_ENERGY);
                        }

                        return true;
                }

                if (json.has("total_act_energy")) {
                        saveSinglePhaseEnergy(
                                        deviceId,
                                        channelId,
                                        json,
                                        "total_act_energy",
                                        totalChannels);
                        return true;
                }

                if (json.has("total_act")) {
                        saveSinglePhaseEnergy(
                                        deviceId,
                                        channelId,
                                        json,
                                        "total_act",
                                        totalChannels);
                        return true;
                }

                if (json.has("activePower")
                                || json.has("active_power")
                                || json.has("act_power")) {
                        saveGenericPower(
                                        deviceId,
                                        channelId,
                                        json,
                                        totalChannels);
                        return true;
                }

                return false;
        }

        private boolean shouldPersist(
                        Long deviceId,
                        int channelId,
                        ReadingKind kind,
                        Instant timestamp) {

                long intervalSeconds = switch (kind) {
                        case SINGLE_PHASE_POWER, THREE_PHASE_POWER ->
                                POWER_WRITE_INTERVAL_SECONDS;
                        case SINGLE_PHASE_ENERGY, THREE_PHASE_ENERGY ->
                                ENERGY_WRITE_INTERVAL_SECONDS;
                };

                long currentBucket = timestamp.getEpochSecond() / intervalSeconds;
                ReadingKey key = new ReadingKey(deviceId, channelId, kind);
                AtomicBoolean shouldPersist = new AtomicBoolean(false);

                lastPersistedBucket.compute(key, (ignored, previousBucket) -> {
                        if (previousBucket == null
                                        || previousBucket != currentBucket) {
                                shouldPersist.set(true);
                                return currentBucket;
                        }

                        return previousBucket;
                });

                return shouldPersist.get();
        }

        private PowerSnapshot aggregatePower(
                        List<PowerSnapshot> snapshots) {

                return new PowerSnapshot(
                                average(snapshots.stream()
                                                .map(PowerSnapshot::voltage)
                                                .toArray(Double[]::new)),
                                sum(snapshots.stream()
                                                .map(PowerSnapshot::current)
                                                .toArray(Double[]::new)),
                                sum(snapshots.stream()
                                                .map(PowerSnapshot::activePower)
                                                .toArray(Double[]::new)),
                                sum(snapshots.stream()
                                                .map(PowerSnapshot::apparentPower)
                                                .toArray(Double[]::new)),
                                average(snapshots.stream()
                                                .map(PowerSnapshot::powerFactor)
                                                .toArray(Double[]::new)),
                                average(snapshots.stream()
                                                .map(PowerSnapshot::frequency)
                                                .toArray(Double[]::new)));
        }

        private int channelFromTopic(
                        String topic,
                        JsonNode json) {

                int separatorIndex = topic.lastIndexOf(':');

                if (separatorIndex >= 0
                                && separatorIndex < topic.length() - 1) {
                        try {
                                return Integer.parseInt(
                                                topic.substring(
                                                                separatorIndex + 1));
                        } catch (NumberFormatException ignored) {
                                // Fall back to the payload channel below.
                        }
                }

                return json.path("id").asInt(
                                json.path("channelId").asInt(0));
        }

        private Set<Integer> normalizeChannels(
                        Set<Integer> channels) {
                return channels == null || channels.isEmpty()
                                ? Set.of(0)
                                : channels;
        }

        private Double getDouble(JsonNode json, String field) {
                return json.has(field) && !json.get(field).isNull()
                                ? json.get(field).asDouble()
                                : null;
        }

        private Double firstPresent(Double... values) {
                return Arrays.stream(values)
                                .filter(Objects::nonNull)
                                .findFirst()
                                .orElse(null);
        }

        private Double sum(Double... values) {
                double sum = 0;
                boolean hasValue = false;

                for (Double value : values) {
                        if (value != null) {
                                sum += value;
                                hasValue = true;
                        }
                }

                return hasValue ? sum : null;
        }

        private Double average(Double... values) {
                double sum = 0;
                int count = 0;

                for (Double value : values) {
                        if (value != null) {
                                sum += value;
                                count++;
                        }
                }

                return count == 0 ? null : sum / count;
        }

        private enum ReadingKind {
                SINGLE_PHASE_ENERGY,
                SINGLE_PHASE_POWER,
                THREE_PHASE_ENERGY,
                THREE_PHASE_POWER
        }

        private record ReadingKey(
                        Long deviceId,
                        int channelId,
                        ReadingKind kind) {
        }

        private record PowerSnapshot(
                        Double voltage,
                        Double current,
                        Double activePower,
                        Double apparentPower,
                        Double powerFactor,
                        Double frequency) {

                private PowerSnapshot merge(PowerSnapshot newer) {
                        return new PowerSnapshot(
                                        firstNonNull(newer.voltage, voltage),
                                        firstNonNull(newer.current, current),
                                        firstNonNull(
                                                        newer.activePower,
                                                        activePower),
                                        firstNonNull(
                                                        newer.apparentPower,
                                                        apparentPower),
                                        firstNonNull(
                                                        newer.powerFactor,
                                                        powerFactor),
                                        firstNonNull(
                                                        newer.frequency,
                                                        frequency));
                }

                private static Double firstNonNull(
                                Double preferred,
                                Double fallback) {
                        return preferred != null ? preferred : fallback;
                }
        }
}
