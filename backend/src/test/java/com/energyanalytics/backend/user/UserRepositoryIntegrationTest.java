package com.energyanalytics.backend.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryIntegrationTest {

    @SuppressWarnings("resource")
    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("energy_test")
            .withUsername("test")
            .withPassword("test");

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("User can be found by email after being persisted")
    void findByEmail_returnsUser_whenUserExists() {
        User user = User.builder()
                .name("João Rodrigues")
                .email("joao@example.com")
                .password("encoded-password")
                .build();

        userRepository.save(user);

        Optional<User> result = userRepository.findByEmail("joao@example.com");

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isNotNull();
        assertThat(result.get().getName())
                .isEqualTo("João Rodrigues");
        assertThat(result.get().getEmail())
                .isEqualTo("joao@example.com");
        assertThat(result.get().getPassword())
                .isEqualTo("encoded-password");
    }

    @Test
    @DisplayName("Email existence check returns the correct result")
    void existsByEmail_returnsCorrectResult() {
        User user = User.builder()
                .name("João Rodrigues")
                .email("joao@example.com")
                .password("encoded-password")
                .build();

        userRepository.save(user);

        assertThat(
                userRepository.existsByEmail("joao@example.com")).isTrue();

        assertThat(
                userRepository.existsByEmail("unknown@example.com")).isFalse();
    }
}