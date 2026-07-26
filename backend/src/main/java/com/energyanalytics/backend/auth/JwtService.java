package com.energyanalytics.backend.auth;

import com.energyanalytics.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class JwtService {

        private final JwtEncoder jwtEncoder;

        @Value("${JWT_EXPIRATION_SECONDS:86400}")
        private long expirationSeconds;

        public String createToken(User user) {
                Instant issuedAt = Instant.now();
                Instant expiresAt = issuedAt.plusSeconds(expirationSeconds);

                JwsHeader header = JwsHeader
                                .with(MacAlgorithm.HS256)
                                .type("JWT")
                                .build();

                JwtClaimsSet claims = JwtClaimsSet.builder()
                                .issuer("volt-energy-analytics")
                                .issuedAt(issuedAt)
                                .expiresAt(expiresAt)
                                .subject(user.getEmail())
                                .claim("userId", user.getId())
                                .claim("name", user.getName())
                                .build();

                return jwtEncoder
                                .encode(JwtEncoderParameters.from(header, claims))
                                .getTokenValue();
        }
}
