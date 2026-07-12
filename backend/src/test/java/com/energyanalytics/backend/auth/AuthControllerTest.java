package com.energyanalytics.backend.auth;

import com.energyanalytics.backend.user.User;
import com.energyanalytics.backend.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        AuthController authController = new AuthController(userRepository, passwordEncoder);

        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Registration succeeds when email is available")
    void register_returnsUser_whenEmailIsAvailable() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "João Rodrigues",
                "joao@example.com",
                "password123");

        when(userRepository.existsByEmail("joao@example.com"))
                .thenReturn(false);

        when(passwordEncoder.encode("password123"))
                .thenReturn("encoded-password");

        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> {
                    User savedUser = invocation.getArgument(0);
                    savedUser.setId(1L);
                    return savedUser;
                });

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("João Rodrigues"))
                .andExpect(jsonPath("$.email").value("joao@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);

        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getName()).isEqualTo("João Rodrigues");
        assertThat(savedUser.getEmail()).isEqualTo("joao@example.com");
        assertThat(savedUser.getPassword()).isEqualTo("encoded-password");
    }

    @Test
    @DisplayName("Registration fails when email is already in use")
    void register_returnsBadRequest_whenEmailAlreadyExists() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "João Rodrigues",
                "joao@example.com",
                "password123");

        when(userRepository.existsByEmail("joao@example.com"))
                .thenReturn(true);

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Email already in use"));

        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("Login succeeds with correct credentials")
    void login_returnsUser_whenCredentialsAreCorrect() throws Exception {
        LoginRequest request = new LoginRequest(
                "joao@example.com",
                "password123");

        User user = User.builder()
                .id(1L)
                .name("João Rodrigues")
                .email("joao@example.com")
                .password("encoded-password")
                .build();

        when(userRepository.findByEmail("joao@example.com"))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches(
                "password123",
                "encoded-password")).thenReturn(true);

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("João Rodrigues"))
                .andExpect(jsonPath("$.email").value("joao@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("Login fails with incorrect password")
    void login_returnsBadRequest_whenPasswordIsIncorrect() throws Exception {
        LoginRequest request = new LoginRequest(
                "joao@example.com",
                "wrong-password");

        User user = User.builder()
                .id(1L)
                .name("João Rodrigues")
                .email("joao@example.com")
                .password("encoded-password")
                .build();

        when(userRepository.findByEmail("joao@example.com"))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches(
                "wrong-password",
                "encoded-password")).thenReturn(false);

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid credentials"));
    }

    @Test
    @DisplayName("Login fails when user does not exist")
    void login_returnsBadRequest_whenUserDoesNotExist() throws Exception {
        LoginRequest request = new LoginRequest(
                "unknown@example.com",
                "password123");

        when(userRepository.findByEmail("unknown@example.com"))
                .thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid credentials"));

        verify(passwordEncoder, never())
                .matches(anyString(), anyString());
    }
}