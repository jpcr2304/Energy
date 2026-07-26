package com.energyanalytics.backend.energy;

import java.time.Instant;
import java.util.Set;

public record DeviceResponse(
                Long id,
                String name,
                DeviceType type,
                String brokerUrl,
                String deviceIdentifier,
                String topic,
                String username,
                boolean hasPassword,
                Set<Integer> totalChannels,
                boolean enabled,
                DeviceStatus status,
                Instant lastSeenAt,
                String lastError,
                Instant createdAt,
                Instant updatedAt) {

        public static DeviceResponse from(EnergyDevice device) {
                return new DeviceResponse(
                                device.getId(),
                                device.getName(),
                                device.getType(),
                                device.getBrokerUrl(),
                                device.getDeviceIdentifier(),
                                device.getTopic(),
                                device.getUsername(),
                                device.getPassword() != null
                                                && !device.getPassword().isBlank(),
                                device.getEffectiveTotalChannels(),
                                device.isEnabled(),
                                device.getStatus(),
                                device.getLastSeenAt(),
                                device.getLastError(),
                                device.getCreatedAt(),
                                device.getUpdatedAt());
        }
}
