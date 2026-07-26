package com.energyanalytics.backend.energy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnergyDeviceRepository
                extends JpaRepository<EnergyDevice, Long> {

        List<EnergyDevice> findAllByUserEmailOrderByCreatedAtDesc(
                        String email);

        List<EnergyDevice> findAllByEnabledTrue();

        Optional<EnergyDevice> findByIdAndUserEmail(
                        Long id,
                        String email);

        boolean existsByUserIdAndBrokerUrlAndTopic(
                        Long userId,
                        String brokerUrl,
                        String topic);

        boolean existsByUserIdAndBrokerUrlAndTopicAndIdNot(
                        Long userId,
                        String brokerUrl,
                        String topic,
                        Long id);
}
