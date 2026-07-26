package com.energyanalytics.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Configuration
public class SecurityConfig {

        private static final String DEVELOPMENT_SECRET = "change-this-development-jwt-secret-before-production";

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public SecretKey jwtSecretKey(
                        @Value("${JWT_SECRET:"
                                        + DEVELOPMENT_SECRET
                                        + "}") String secret) {

                if (secret == null || secret.length() < 32) {
                        throw new IllegalStateException(
                                        "JWT_SECRET must contain at least 32 characters");
                }

                try {
                        byte[] key = MessageDigest
                                        .getInstance("SHA-256")
                                        .digest(secret.getBytes(StandardCharsets.UTF_8));

                        return new SecretKeySpec(key, "HmacSHA256");

                } catch (NoSuchAlgorithmException exception) {
                        throw new IllegalStateException(
                                        "SHA-256 is not available",
                                        exception);
                }
        }

        @Bean
        public JwtEncoder jwtEncoder(SecretKey secretKey) {
                return NimbusJwtEncoder
                                .withSecretKey(secretKey)
                                .algorithm(MacAlgorithm.HS256)
                                .build();
        }

        @Bean
        public JwtDecoder jwtDecoder(SecretKey secretKey) {
                return NimbusJwtDecoder
                                .withSecretKey(secretKey)
                                .macAlgorithm(MacAlgorithm.HS256)
                                .build();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                http
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(
                                                                SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .anyRequest().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .jwt(Customizer.withDefaults()));

                return http.build();
        }
}
