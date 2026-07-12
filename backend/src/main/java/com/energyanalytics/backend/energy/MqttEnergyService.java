package com.energyanalytics.backend.energy;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class MqttEnergyService {

    private final EnergyMessageProcessor energyMessageProcessor;

    private MqttClient client;

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.topic:shellyemg3-e4b323227cfc/#}")
    private String topic;

    @PostConstruct
    public void connect() throws MqttException {
        client = new MqttClient(
                brokerUrl,
                "energy-backend-" + MqttClient.generateClientId(),
                new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        client.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                System.out.println(
                        "MQTT connection lost: " + cause.getMessage());
            }

            @Override
            public void messageArrived(
                    String topic,
                    MqttMessage message) {
                handleMessage(topic, message);
            }

            @Override
            public void deliveryComplete(
                    IMqttDeliveryToken token) {
            }
        });

        client.connect(options);
        client.subscribe(topic);

        System.out.println("MQTT connected to " + brokerUrl);
        System.out.println("Subscribed to " + topic);
    }

    private void handleMessage(
            String topic,
            MqttMessage message) {
        try {
            String payload = new String(
                    message.getPayload(),
                    StandardCharsets.UTF_8);

            energyMessageProcessor.process(topic, payload);

        } catch (Exception exception) {
            System.out.println(
                    "Failed to process MQTT message: "
                            + exception.getMessage());
        }
    }

    @PreDestroy
    public void disconnect() {
        try {
            if (client != null && client.isConnected()) {
                client.disconnect();
                client.close();
            }
        } catch (MqttException exception) {
            System.out.println(
                    "Failed to close MQTT client: "
                            + exception.getMessage());
        }
    }
}