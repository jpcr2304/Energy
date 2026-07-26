package com.energyanalytics.backend.energy;

import com.energyanalytics.backend.user.User;
import com.energyanalytics.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private static final Set<String> SUPPORTED_BROKER_SCHEMES = Set.of("tcp", "ssl", "ws", "wss");

    private static final Pattern DEVICE_IDENTIFIER_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9-]{2,189}$");

    private final EnergyDeviceRepository energyDeviceRepository;
    private final MqttEnergyService mqttEnergyService;
    private final DeviceCredentialService deviceCredentialService;
    private final UserRepository userRepository;

    @Value("${mqtt.default-broker-url:tcp://localhost:1883}")
    private String defaultBrokerUrl;

    @Transactional(readOnly = true)
    public List<DeviceResponse> getDevices(String ownerKey) {
        return energyDeviceRepository
                .findAllByUserEmailOrderByCreatedAtDesc(ownerKey)
                .stream()
                .map(DeviceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeviceResponse getDevice(Long id, String ownerKey) {
        return DeviceResponse.from(findOwnedDevice(id, ownerKey));
    }

    @Transactional
    public DeviceResponse create(
            String ownerKey,
            DeviceConfigurationRequest request) {

        String name = normalizeName(request.name());
        DeviceType type = requireType(request.type());
        String deviceIdentifier = normalizeDeviceIdentifier(
                request.deviceIdentifier(),
                type);
        String brokerUrl = normalizeBrokerUrl(request.brokerUrl());
        String topic = resolveTopic(
                type,
                deviceIdentifier,
                request.topic());
        Set<Integer> totalChannels = normalizeTotalChannels(
                request.totalChannels(),
                type);
        User user = findUser(ownerKey);

        if (energyDeviceRepository
                .existsByUserIdAndBrokerUrlAndTopic(
                        user.getId(),
                        brokerUrl,
                        topic)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This MQTT source is already configured");
        }

        boolean enabled = request.enabled() == null
                || request.enabled();

        EnergyDevice device = EnergyDevice.builder()
                .user(user)
                .name(name)
                .type(type)
                .brokerUrl(brokerUrl)
                .deviceIdentifier(deviceIdentifier)
                .topic(topic)
                .username(normalizeOptional(request.username()))
                .password(encryptPassword(request.password()))
                .totalChannels(totalChannels)
                .enabled(enabled)
                .status(enabled
                        ? DeviceStatus.CONNECTING
                        : DeviceStatus.DISCONNECTED)
                .build();

        EnergyDevice saved = energyDeviceRepository.save(device);

        if (saved.isEnabled()) {
            connectAndRefresh(saved);
        }

        return DeviceResponse.from(saved);
    }

    @Transactional
    public DeviceResponse update(
            Long id,
            String ownerKey,
            DeviceConfigurationRequest request) {

        EnergyDevice device = findOwnedDevice(id, ownerKey);

        DeviceType type = request.type() == null
                ? device.getType()
                : request.type();
        boolean typeChanged = type != device.getType();

        String identifierSource = request.deviceIdentifier() == null
                ? device.getDeviceIdentifier()
                : request.deviceIdentifier();

        String deviceIdentifier = normalizeDeviceIdentifier(
                identifierSource,
                type);

        String brokerUrl = request.brokerUrl() == null
                ? device.getBrokerUrl()
                : normalizeBrokerUrl(request.brokerUrl());

        String topicSource = request.topic() == null
                ? device.getTopic()
                : request.topic();

        String topic = resolveTopic(
                type,
                deviceIdentifier,
                topicSource);
        Set<Integer> totalChannels = normalizeTotalChannels(
                request.totalChannels() != null
                        ? request.totalChannels()
                        : typeChanged
                                ? null
                                : device.getEffectiveTotalChannels(),
                type);

        if (energyDeviceRepository
                .existsByUserIdAndBrokerUrlAndTopicAndIdNot(
                        device.getUser().getId(),
                        brokerUrl,
                        topic,
                        id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This MQTT source is already configured");
        }

        if (request.name() != null) {
            device.setName(normalizeName(request.name()));
        }

        device.setType(type);
        device.setBrokerUrl(brokerUrl);
        device.setDeviceIdentifier(deviceIdentifier);
        device.setTopic(topic);
        device.setTotalChannels(totalChannels);

        if (request.username() != null) {
            device.setUsername(normalizeOptional(request.username()));
        }

        if (request.password() != null) {
            device.setPassword(encryptPassword(request.password()));
        }

        if (request.enabled() != null) {
            device.setEnabled(request.enabled());
        }

        device.setLastError(null);
        device.setStatus(device.isEnabled()
                ? DeviceStatus.CONNECTING
                : DeviceStatus.DISCONNECTED);

        energyDeviceRepository.save(device);

        if (device.isEnabled()) {
            connectAndRefresh(device);
        } else {
            mqttEnergyService.disconnectDevice(device.getId());
        }

        return DeviceResponse.from(device);
    }

    @Transactional
    public DeviceResponse connect(Long id, String ownerKey) {
        EnergyDevice device = findOwnedDevice(id, ownerKey);

        device.setEnabled(true);
        device.setStatus(DeviceStatus.CONNECTING);
        device.setLastError(null);
        energyDeviceRepository.save(device);

        connectAndRefresh(device);

        return DeviceResponse.from(device);
    }

    @Transactional
    public DeviceResponse disconnect(Long id, String ownerKey) {
        EnergyDevice device = findOwnedDevice(id, ownerKey);

        mqttEnergyService.disconnectDevice(device.getId());

        device.setEnabled(false);
        device.setStatus(DeviceStatus.DISCONNECTED);
        device.setLastError(null);
        energyDeviceRepository.save(device);

        return DeviceResponse.from(device);
    }

    @Transactional
    public void delete(Long id, String ownerKey) {
        EnergyDevice device = findOwnedDevice(id, ownerKey);
        mqttEnergyService.disconnectDevice(device.getId());
        energyDeviceRepository.delete(device);
    }

    private void connectAndRefresh(EnergyDevice device) {
        try {
            mqttEnergyService.connectDevice(device);
        } catch (DeviceConnectionException exception) {
            // The MQTT service already stores the ERROR status. Keeping the
            // configuration allows the user to correct it or reconnect later.
        }
    }

    private EnergyDevice findOwnedDevice(Long id, String ownerKey) {
        return energyDeviceRepository
                .findByIdAndUserEmail(id, ownerKey)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Device not found"));
    }

    private String normalizeName(String value) {
        String name = requireText(value, "Device name is required");

        if (name.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Device name cannot exceed 100 characters");
        }

        return name;
    }

    private DeviceType requireType(DeviceType value) {
        if (value == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Device type is required");
        }

        return value;
    }

    private String normalizeBrokerUrl(String value) {
        String brokerUrl = requireText(
                value == null ? defaultBrokerUrl : value,
                "Broker URL is required");

        if (!brokerUrl.contains("://")) {
            brokerUrl = "tcp://" + brokerUrl;
        }

        try {
            URI uri = URI.create(brokerUrl);
            String scheme = uri.getScheme() == null
                    ? ""
                    : uri.getScheme().toLowerCase(Locale.ROOT);

            if (!SUPPORTED_BROKER_SCHEMES.contains(scheme)
                    || uri.getHost() == null) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Broker URL must use tcp, ssl, ws or wss");
        }

        return brokerUrl;
    }

    private String normalizeTopic(String value) {
        String topic = requireText(value, "MQTT topic is required");

        if (topic.length() > 512 || topic.indexOf('\0') >= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid MQTT topic");
        }

        return topic;
    }

    private String normalizeDeviceIdentifier(
            String value,
            DeviceType type) {

        if (type == DeviceType.MQTT
                && (value == null || value.isBlank())) {
            return null;
        }

        String identifier = requireText(
                value,
                "Device identifier is required")
                .toLowerCase(Locale.ROOT);

        if (!DEVICE_IDENTIFIER_PATTERN.matcher(identifier).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid device identifier");
        }

        if (type == DeviceType.SHELLY_EM_GEN3
                && !identifier.startsWith("shellyemg3-")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Shelly EM Gen3 identifier must start with shellyemg3-");
        }

        if (type == DeviceType.SHELLY_PRO_3EM
                && !identifier.startsWith("shellypro3em-")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Shelly Pro 3EM identifier must start with shellypro3em-");
        }

        return identifier;
    }

    private String resolveTopic(
            DeviceType type,
            String deviceIdentifier,
            String requestedTopic) {

        if (type == DeviceType.SHELLY_EM_GEN3
                || type == DeviceType.SHELLY_PRO_3EM) {
            return deviceIdentifier + "/#";
        }

        return normalizeTopic(requestedTopic);
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private Set<Integer> normalizeTotalChannels(
            Set<Integer> requestedChannels,
            DeviceType type) {

        if (type == DeviceType.SHELLY_PRO_3EM) {
            return new LinkedHashSet<>(Set.of(0));
        }

        Set<Integer> channels = requestedChannels == null
                ? Set.of(0)
                : requestedChannels;

        if (channels.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one total consumption channel is required");
        }

        int maximumChannel = type == DeviceType.SHELLY_EM_GEN3
                ? 1
                : 31;
        TreeSet<Integer> normalized = new TreeSet<>();

        for (Integer channel : channels) {
            if (channel == null
                    || channel < 0
                    || channel > maximumChannel) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid total consumption channel");
            }

            normalized.add(channel);
        }

        return new LinkedHashSet<>(normalized);
    }

    private String encryptPassword(String password) {
        String normalized = normalizeOptional(password);
        return normalized == null
                ? null
                : deviceCredentialService.encrypt(normalized);
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message);
        }

        return value.trim();
    }

    private User findUser(String email) {
        return userRepository
                .findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user was not found"));
    }
}
