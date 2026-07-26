package com.energyanalytics.backend.energy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class DeviceCredentialService {

    private static final String PREFIX = "v1:";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecureRandom secureRandom = new SecureRandom();
    private final String secret;

    public DeviceCredentialService(
            @Value("${device.credentials.secret:}") String secret) {
        this.secret = secret;
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return null;
        }

        requireSecret();

        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    createKey(),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));

            byte[] encrypted = cipher.doFinal(
                    plainText.getBytes(StandardCharsets.UTF_8));

            byte[] result = ByteBuffer
                    .allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array();

            return PREFIX + Base64.getEncoder().encodeToString(result);

        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException(
                    "Could not encrypt MQTT credentials",
                    exception);
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isBlank()) {
            return null;
        }

        if (!encryptedText.startsWith(PREFIX)) {
            throw new IllegalStateException(
                    "Unsupported credential format");
        }

        requireSecret();

        try {
            byte[] combined = Base64.getDecoder().decode(
                    encryptedText.substring(PREFIX.length()));

            if (combined.length <= IV_LENGTH) {
                throw new IllegalStateException(
                        "Invalid encrypted credential");
            }

            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[combined.length - IV_LENGTH];

            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            System.arraycopy(
                    combined,
                    IV_LENGTH,
                    encrypted,
                    0,
                    encrypted.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    createKey(),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));

            return new String(
                    cipher.doFinal(encrypted),
                    StandardCharsets.UTF_8);

        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Could not decrypt MQTT credentials",
                    exception);
        }
    }

    private SecretKeySpec createKey()
            throws GeneralSecurityException {
        byte[] key = MessageDigest
                .getInstance("SHA-256")
                .digest(secret.getBytes(StandardCharsets.UTF_8));

        return new SecretKeySpec(key, "AES");
    }

    private void requireSecret() {
        if (secret == null || secret.length() < 16) {
            throw new IllegalStateException(
                    "Set device.credentials.secret to at least 16 characters");
        }
    }
}
