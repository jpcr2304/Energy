package com.energyanalytics.backend.auth;

public record RegisterRequest(
        String name,
        String email,
        String password) {
}