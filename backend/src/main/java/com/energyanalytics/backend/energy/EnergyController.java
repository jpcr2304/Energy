package com.energyanalytics.backend.energy;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/energy")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class EnergyController {

        private final EnergyReadingRepository energyReadingRepository;
        private final EnergyDeviceRepository energyDeviceRepository;

        @GetMapping("/points")
        public ResponseEntity<List<EnergyPointResponse>> getEnergyPoints(
                        @RequestParam(required = false) Long deviceId,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end,
                        Principal principal) {

                Instant now = Instant.now();
                Instant finalStart = start != null
                                ? start
                                : now.minus(30, ChronoUnit.DAYS);
                Instant finalEnd = end != null ? end : now;

                validateRange(finalStart, finalEnd);
                Long effectiveDeviceId = resolveDeviceId(deviceId, principal);

                List<EnergyReading> readings = effectiveDeviceId == null
                                ? List.of()
                                : energyReadingRepository
                                                .findByDeviceIdAndTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                                                                effectiveDeviceId,
                                                                finalStart,
                                                                finalEnd);

                List<EnergyPointResponse> response =
                                combineChannelReadings(readings);

                return ResponseEntity.ok(response);
        }

        private List<EnergyPointResponse> combineChannelReadings(
                        List<EnergyReading> readings) {

                Map<Integer, Double> previousValueByChannel = new HashMap<>();
                List<EnergyPointResponse> points = new ArrayList<>();
                double combinedAccumulated = 0;

                for (EnergyReading reading : readings) {
                        Double currentValue = reading.getTotalActEnergyKwh();

                        if (currentValue == null
                                        || !Double.isFinite(currentValue)) {
                                continue;
                        }

                        int channelId = reading.getChannelId() == null
                                        ? 0
                                        : reading.getChannelId();

                        Double previousValue = previousValueByChannel.put(
                                        channelId,
                                        currentValue);

                        if (points.isEmpty()) {
                                points.add(new EnergyPointResponse(
                                                reading.getTimestamp(),
                                                0));
                        }

                        if (previousValue == null) {
                                continue;
                        }

                        double channelConsumption =
                                        currentValue - previousValue;

                        if (channelConsumption < 0
                                        || !Double.isFinite(channelConsumption)) {
                                // The meter counter was reset. The current
                                // reading becomes the new baseline.
                                continue;
                        }

                        combinedAccumulated = Math.round(
                                        (combinedAccumulated
                                                        + channelConsumption)
                                                        * 1_000_000d)
                                        / 1_000_000d;

                        points.add(new EnergyPointResponse(
                                        reading.getTimestamp(),
                                        combinedAccumulated));
                }

                return points;
        }

        @GetMapping("/latest")
        public ResponseEntity<?> getLatestReading(
                        @RequestParam(required = false) Long deviceId,
                        Principal principal) {

                Long effectiveDeviceId = resolveDeviceId(deviceId, principal);

                if (effectiveDeviceId == null) {
                        return ResponseEntity.noContent().build();
                }

                return energyReadingRepository
                                .findTopByDeviceIdOrderByTimestampDesc(effectiveDeviceId)
                                .map(reading -> ResponseEntity.ok(
                                                new EnergyLatestResponse(
                                                                reading.getTimestamp(),
                                                                reading.getVoltage(),
                                                                reading.getCurrent(),
                                                                reading.getActivePower(),
                                                                reading.getTotalActEnergyKwh())))
                                .orElseGet(() -> ResponseEntity.noContent().build());
        }

        private Long resolveDeviceId(
                        Long requestedDeviceId,
                        Principal principal) {

                if (principal == null
                                || principal.getName() == null
                                || principal.getName().isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Authentication is required");
                }

                if (requestedDeviceId != null) {
                        return energyDeviceRepository
                                        .findByIdAndUserEmail(
                                                        requestedDeviceId,
                                                        principal.getName())
                                        .map(EnergyDevice::getId)
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND,
                                                        "Device not found"));
                }

                List<EnergyDevice> devices = energyDeviceRepository
                                .findAllByUserEmailOrderByCreatedAtDesc(
                                                principal.getName());

                if (devices.isEmpty()) {
                        return null;
                }

                if (devices.size() > 1) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "deviceId is required when more than one device exists");
                }

                return devices.get(0).getId();
        }

        private void validateRange(Instant start, Instant end) {
                if (!start.isBefore(end)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Start must be before end");
                }
        }
}
