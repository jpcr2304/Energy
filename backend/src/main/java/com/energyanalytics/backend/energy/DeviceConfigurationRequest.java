package com.energyanalytics.backend.energy;

import java.util.Set;

public record DeviceConfigurationRequest(
                String name,
                DeviceType type,
                String brokerUrl,
                String deviceIdentifier,
                String topic,
                String username,
                String password,
                Set<Integer> totalChannels,
                Boolean enabled) {
}
