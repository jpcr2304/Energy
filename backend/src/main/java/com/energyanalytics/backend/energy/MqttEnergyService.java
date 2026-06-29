package com.energyanalytics.backend.energy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class MqttEnergyService {

    private final EnergyReadingRepository energyReadingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.topic:shellyemg3-e4b323227cfc/#}")
    private String topic;

    @PostConstruct
    public void connect() throws MqttException {
        MqttClient client = new MqttClient(
                brokerUrl,
                "energy-backend-" + MqttClient.generateClientId(),
                new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        client.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                System.out.println("MQTT connection lost: " + cause.getMessage());
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                handleMessage(topic, message);
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
            }
        });

        client.connect(options);
        client.subscribe(topic);

        System.out.println("MQTT connected to " + brokerUrl);
        System.out.println("Subscribed to " + topic);
    }

    private void handleMessage(String topic, MqttMessage message) {
        try {
            String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
            JsonNode json = objectMapper.readTree(payload);

            if (topic.endsWith("/status/em1:0")) {
                saveInstantPowerReading(json);
            }

            if (topic.endsWith("/status/em1data:0")) {
                saveEnergyAccumulatedReading(json);
            }

            if (topic.endsWith("/events/rpc")) {
                saveFromRpcEvent(json);
            }

        } catch (Exception e) {
            System.out.println("Failed to process MQTT message: " + e.getMessage());
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

        JsonNode em1Data0 = params.path("em1data:0");
        if (!em1Data0.isMissingNode() && em1Data0.has("total_act_energy")) {
            saveEnergyAccumulatedReading(em1Data0);
        }

        JsonNode em10 = params.path("em1:0");
        if (!em10.isMissingNode() && em10.has("act_power")) {
            EnergyReading reading = EnergyReading.builder()
                    .timestamp(Instant.now())
                    .channelId(0)
                    .voltage(getDouble(em10, "voltage"))
                    .current(getDouble(em10, "current"))
                    .activePower(getDouble(em10, "act_power"))
                    .apparentPower(getDouble(em10, "aprt_power"))
                    .powerFactor(getDouble(em10, "pf"))
                    .frequency(getDouble(em10, "freq"))
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