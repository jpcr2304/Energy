package com.energyanalytics.backend.energy;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/energy")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class EnergyController {

    private final EnergyReadingRepository energyReadingRepository;

    @GetMapping("/points")
    public ResponseEntity<List<EnergyPointResponse>> getEnergyPoints(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end) {
        Instant now = Instant.now();

        Instant finalStart = start != null
                ? start
                : now.minus(30, ChronoUnit.DAYS);

        Instant finalEnd = end != null
                ? end
                : now;

        List<EnergyPointResponse> response = energyReadingRepository
                .findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                        finalStart,
                        finalEnd)
                .stream()
                .map(reading -> new EnergyPointResponse(
                        reading.getTimestamp(),
                        reading.getTotalActEnergyKwh()))
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestReading() {
        return energyReadingRepository
                .findTopByOrderByTimestampDesc()
                .map(reading -> ResponseEntity.ok(
                        new EnergyLatestResponse(
                                reading.getTimestamp(),
                                reading.getVoltage(),
                                reading.getCurrent(),
                                reading.getActivePower(),
                                reading.getTotalActEnergyKwh())))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}