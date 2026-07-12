package com.energyanalytics.backend.energy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class EnergyControllerTest {

    @Mock
    private EnergyReadingRepository energyReadingRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EnergyController energyController = new EnergyController(energyReadingRepository);

        mockMvc = MockMvcBuilders
                .standaloneSetup(energyController)
                .build();
    }

    @Test
    @DisplayName("Energy points are returned for the requested date range")
    void getEnergyPoints_returnsReadingsForDateRange() throws Exception {
        Instant start = Instant.parse("2026-07-01T00:00:00Z");
        Instant end = Instant.parse("2026-07-02T00:00:00Z");

        EnergyReading firstReading = EnergyReading.builder()
                .id(1L)
                .timestamp(Instant.parse("2026-07-01T10:00:00Z"))
                .totalActEnergyKwh(10.5)
                .build();

        EnergyReading secondReading = EnergyReading.builder()
                .id(2L)
                .timestamp(Instant.parse("2026-07-01T11:00:00Z"))
                .totalActEnergyKwh(11.2)
                .build();

        when(energyReadingRepository
                .findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                        start,
                        end))
                .thenReturn(List.of(firstReading, secondReading));

        mockMvc.perform(get("/api/energy/points")
                .param("start", start.toString())
                .param("end", end.toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].timestamp")
                        .value("2026-07-01T10:00:00Z"))
                .andExpect(jsonPath("$[0].accumulated").value(10.5))
                .andExpect(jsonPath("$[1].timestamp")
                        .value("2026-07-01T11:00:00Z"))
                .andExpect(jsonPath("$[1].accumulated").value(11.2));

        verify(energyReadingRepository)
                .findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                        start,
                        end);
    }

    @Test
    @DisplayName("An empty array is returned when no energy points exist")
    void getEnergyPoints_returnsEmptyArray_whenNoReadingsExist()
            throws Exception {

        Instant start = Instant.parse("2026-07-01T00:00:00Z");
        Instant end = Instant.parse("2026-07-02T00:00:00Z");

        when(energyReadingRepository
                .findByTimestampBetweenAndTotalActEnergyKwhIsNotNullOrderByTimestampAsc(
                        start,
                        end))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/energy/points")
                .param("start", start.toString())
                .param("end", end.toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(content().json("[]"));
    }

    @Test
    @DisplayName("The latest energy reading is returned when data exists")
    void getLatestReading_returnsLatestReading() throws Exception {
        EnergyReading reading = EnergyReading.builder()
                .id(1L)
                .timestamp(Instant.parse("2026-07-12T18:00:00Z"))
                .voltage(230.4)
                .current(2.1)
                .activePower(483.8)
                .totalActEnergyKwh(12.5)
                .build();

        when(energyReadingRepository.findTopByOrderByTimestampDesc())
                .thenReturn(Optional.of(reading));

        mockMvc.perform(get("/api/energy/latest"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.timestamp")
                        .value("2026-07-12T18:00:00Z"))
                .andExpect(jsonPath("$.voltage").value(230.4))
                .andExpect(jsonPath("$.current").value(2.1))
                .andExpect(jsonPath("$.activePower").value(483.8))
                .andExpect(jsonPath("$.totalActEnergyKwh").value(12.5));
    }

    @Test
    @DisplayName("No content is returned when no energy readings exist")
    void getLatestReading_returnsNoContent_whenNoReadingsExist()
            throws Exception {

        when(energyReadingRepository.findTopByOrderByTimestampDesc())
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/energy/latest"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }
}