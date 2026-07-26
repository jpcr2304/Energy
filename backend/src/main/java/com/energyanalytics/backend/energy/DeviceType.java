package com.energyanalytics.backend.energy;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum DeviceType {
    SHELLY_EM_GEN3,
    SHELLY_PRO_3EM,
    MQTT;

    @JsonCreator
    public static DeviceType fromJson(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim()
                .replace('_', '-')
                .toLowerCase(Locale.ROOT);

        return switch (normalized) {
            case "shelly-em", "shelly-em-gen3" ->
                SHELLY_EM_GEN3;
            case "shelly-pro", "shelly-pro-3em" ->
                SHELLY_PRO_3EM;
            case "mqtt" -> MQTT;
            default -> throw new IllegalArgumentException(
                    "Unsupported device type: " + value);
        };
    }

    @JsonValue
    public String toJson() {
        return switch (this) {
            case SHELLY_EM_GEN3 -> "shelly-em";
            case SHELLY_PRO_3EM -> "shelly-pro";
            case MQTT -> "mqtt";
        };
    }
}
