package com.energyanalytics.backend.auth;

public record AuthResponse(
        Long id,
        String name,
        String email) {
}