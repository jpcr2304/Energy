package com.energyanalytics.backend.auth;

import com.energyanalytics.backend.user.User;
import com.energyanalytics.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;

        @PostMapping("/register")
        public ResponseEntity<?> register(
                        @RequestBody RegisterRequest request) {

                if (userRepository.existsByEmail(request.email())) {
                        return ResponseEntity
                                        .badRequest()
                                        .body("Email already in use");
                }

                User user = User.builder()
                                .name(request.name().trim())
                                .email(request.email().trim().toLowerCase())
                                .password(passwordEncoder.encode(request.password()))
                                .build();

                userRepository.save(user);

                return ResponseEntity.ok(toResponse(user));
        }

        @PostMapping("/login")
        public ResponseEntity<?> login(
                        @RequestBody LoginRequest request) {

                String email = request.email().trim().toLowerCase();

                User user = userRepository.findByEmail(email)
                                .orElse(null);

                if (user == null
                                || !passwordEncoder.matches(
                                                request.password(),
                                                user.getPassword())) {
                        return ResponseEntity
                                        .badRequest()
                                        .body("Invalid credentials");
                }

                return ResponseEntity.ok(toResponse(user));
        }

        private AuthResponse toResponse(User user) {
                return new AuthResponse(
                                user.getId(),
                                user.getName(),
                                user.getEmail(),
                                jwtService.createToken(user));
        }
}
