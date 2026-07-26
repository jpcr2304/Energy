package com.energyanalytics.backend.energy;

import com.energyanalytics.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "energy_devices", uniqueConstraints = @UniqueConstraint(name = "uk_energy_device_user_broker_topic", columnNames = {
        "user_id", "broker_url", "mqtt_topic" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DeviceType type;

    @Column(name = "broker_url", nullable = false, length = 255)
    private String brokerUrl;

    @Column(name = "mqtt_topic", nullable = false, length = 512)
    private String topic;

    @Column(name = "device_identifier", length = 190)
    private String deviceIdentifier;

    @Column(name = "mqtt_username", length = 190)
    private String username;

    @Column(name = "mqtt_password", length = 512)
    private String password;

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "energy_device_total_channels",
            joinColumns = @JoinColumn(name = "device_id"))
    @Column(name = "channel_id", nullable = false)
    private Set<Integer> totalChannels = new LinkedHashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DeviceStatus status = DeviceStatus.DISCONNECTED;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Set<Integer> getEffectiveTotalChannels() {
        return totalChannels == null || totalChannels.isEmpty()
                ? Set.of(0)
                : Set.copyOf(totalChannels);
    }
}
