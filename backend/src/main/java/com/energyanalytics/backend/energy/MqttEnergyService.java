package com.energyanalytics.backend.energy;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MqttEnergyService {

    private static final Duration LAST_SEEN_WRITE_INTERVAL = Duration.ofSeconds(30);
    private static final Duration DEVICE_VERIFICATION_TIMEOUT = Duration.ofSeconds(20);

    private final EnergyMessageProcessor energyMessageProcessor;
    private final EnergyDeviceRepository energyDeviceRepository;
    private final DeviceCredentialService deviceCredentialService;

    private final Map<Long, MqttClient> clients = new ConcurrentHashMap<>();

    private final Map<Long, Instant> lastSeenWrites = new ConcurrentHashMap<>();

    private final Map<Long, ScheduledFuture<?>> verificationTimeouts =
            new ConcurrentHashMap<>();

    private final ScheduledExecutorService verificationScheduler =
            Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(
                        runnable,
                        "mqtt-device-verification");
                thread.setDaemon(true);
                return thread;
            });

    @PostConstruct
    public void connectConfiguredDevices() {
        energyDeviceRepository
                .findAllByEnabledTrue()
                .forEach(device -> {
                    try {
                        connectDevice(device);
                    } catch (DeviceConnectionException exception) {
                        System.out.println(exception.getMessage());
                    }
                });
    }

    public synchronized void connectDevice(EnergyDevice device) {
        disconnectClient(device.getId());
        energyMessageProcessor.resetDevice(device.getId());

        device.setStatus(DeviceStatus.CONNECTING);
        device.setLastError(null);
        energyDeviceRepository.save(device);

        MqttClient mqttClient = null;

        try {
            mqttClient = new MqttClient(
                    device.getBrokerUrl(),
                    createClientId(device.getId()),
                    new MemoryPersistence());

            MqttClient finalClient = mqttClient;
            Set<Integer> totalChannels =
                    device.getEffectiveTotalChannels();

            mqttClient.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(
                        boolean reconnect,
                        String serverURI) {
                    if (!reconnect) {
                        return;
                    }

                    try {
                        updateDeviceState(
                                device.getId(),
                                DeviceStatus.CONNECTING,
                                null);
                        scheduleVerificationTimeout(device.getId());
                        finalClient.subscribe(device.getTopic(), 1);
                    } catch (MqttException exception) {
                        updateDeviceState(
                                device.getId(),
                                DeviceStatus.ERROR,
                                "Failed to subscribe: "
                                        + exception.getMessage());
                    }
                }

                @Override
                public void connectionLost(Throwable cause) {
                    updateDeviceState(
                            device.getId(),
                            DeviceStatus.DISCONNECTED,
                            cause == null
                                    ? "MQTT connection lost"
                                    : cause.getMessage());
                }

                @Override
                public void messageArrived(
                        String topic,
                        MqttMessage message) {
                    handleMessage(
                            device.getId(),
                            device.getType(),
                            totalChannels,
                            topic,
                            message);
                }

                @Override
                public void deliveryComplete(
                        IMqttDeliveryToken token) {
                }
            });

            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(30);

            if (device.getUsername() != null) {
                options.setUserName(device.getUsername());
            }

            if (device.getPassword() != null) {
                options.setPassword(
                        deviceCredentialService
                                .decrypt(device.getPassword())
                                .toCharArray());
            }

            mqttClient.connect(options);
            clients.put(device.getId(), mqttClient);
            scheduleVerificationTimeout(device.getId());
            mqttClient.subscribe(device.getTopic(), 1);

        } catch (Exception exception) {
            closeQuietly(mqttClient);
            clients.remove(device.getId());
            cancelVerificationTimeout(device.getId());

            updateDeviceState(
                    device.getId(),
                    DeviceStatus.ERROR,
                    exception.getMessage());

            throw new DeviceConnectionException(
                    "Could not connect device to MQTT broker",
                    exception);
        }
    }

    public synchronized void disconnectDevice(Long deviceId) {
        disconnectClient(deviceId);
        cancelVerificationTimeout(deviceId);
        lastSeenWrites.remove(deviceId);
        energyMessageProcessor.resetDevice(deviceId);
    }

    private void handleMessage(
            Long deviceId,
            DeviceType deviceType,
            Set<Integer> totalChannels,
            String topic,
            MqttMessage message) {
        try {
            String payload = new String(
                    message.getPayload(),
                    StandardCharsets.UTF_8);

            boolean recognizedReading = energyMessageProcessor.process(
                    deviceId,
                    deviceType,
                    totalChannels,
                    topic,
                    payload);

            if (recognizedReading) {
                markDeviceSeen(deviceId);
            }

        } catch (Exception exception) {
            updateDeviceState(
                    deviceId,
                    DeviceStatus.ERROR,
                    "Failed to process MQTT message: "
                            + exception.getMessage());
        }
    }

    private void markDeviceSeen(Long deviceId) {
        Instant now = Instant.now();
        Instant previousWrite = lastSeenWrites.get(deviceId);

        cancelVerificationTimeout(deviceId);

        if (previousWrite != null
                && Duration.between(previousWrite, now)
                        .compareTo(LAST_SEEN_WRITE_INTERVAL) < 0) {
            return;
        }

        lastSeenWrites.put(deviceId, now);

        energyDeviceRepository.findById(deviceId).ifPresent(device -> {
            device.setLastSeenAt(now);
            device.setStatus(DeviceStatus.CONNECTED);
            device.setLastError(null);
            energyDeviceRepository.save(device);
        });
    }

    private void updateDeviceState(
            Long deviceId,
            DeviceStatus status,
            String error) {
        if (status == DeviceStatus.ERROR
                || status == DeviceStatus.DISCONNECTED) {
            cancelVerificationTimeout(deviceId);
        }

        energyDeviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus(status);
            device.setLastError(limitError(error));
            energyDeviceRepository.save(device);
        });
    }

    private void scheduleVerificationTimeout(Long deviceId) {
        cancelVerificationTimeout(deviceId);

        ScheduledFuture<?> timeout = verificationScheduler.schedule(
                () -> markVerificationFailed(deviceId),
                DEVICE_VERIFICATION_TIMEOUT.toSeconds(),
                TimeUnit.SECONDS);

        verificationTimeouts.put(deviceId, timeout);
    }

    private synchronized void markVerificationFailed(Long deviceId) {
        verificationTimeouts.remove(deviceId);

        energyDeviceRepository.findById(deviceId).ifPresent(device -> {
            if (!device.isEnabled()
                    || device.getStatus() != DeviceStatus.CONNECTING) {
                return;
            }

            device.setStatus(DeviceStatus.ERROR);
            device.setLastError(
                    "No energy data was received. Check the device identifier and MQTT configuration.");
            energyDeviceRepository.save(device);
        });
    }

    private void cancelVerificationTimeout(Long deviceId) {
        ScheduledFuture<?> timeout = verificationTimeouts.remove(deviceId);

        if (timeout != null) {
            timeout.cancel(false);
        }
    }

    private void disconnectClient(Long deviceId) {
        MqttClient client = clients.remove(deviceId);
        closeQuietly(client);
    }

    private void closeQuietly(MqttClient client) {
        if (client == null) {
            return;
        }

        try {
            if (client.isConnected()) {
                client.disconnect();
            }
            client.close();
        } catch (MqttException exception) {
            System.out.println(
                    "Failed to close MQTT client: "
                            + exception.getMessage());
        }
    }

    private String createClientId(Long deviceId) {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8);

        return "volt-" + deviceId + "-" + suffix;
    }

    private String limitError(String error) {
        if (error == null || error.isBlank()) {
            return null;
        }

        return error.length() <= 1000
                ? error
                : error.substring(0, 1000);
    }

    @PreDestroy
    public void disconnectAll() {
        verificationTimeouts.values()
                .forEach(timeout -> timeout.cancel(false));
        verificationTimeouts.clear();
        verificationScheduler.shutdownNow();
        clients.values().forEach(this::closeQuietly);
        clients.clear();
        lastSeenWrites.clear();
    }
}
