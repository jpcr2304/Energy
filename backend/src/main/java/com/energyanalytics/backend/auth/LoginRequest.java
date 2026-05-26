package com.energyanalytics.backend.auth;

public record LoginRequest(
        String email,
        String password) {
}