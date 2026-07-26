package com.energyanalytics.backend.energy;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    public List<DeviceResponse> getDevices(Principal principal) {
        return deviceService.getDevices(currentOwner(principal));
    }

    @GetMapping("/{id}")
    public DeviceResponse getDevice(
            @PathVariable Long id,
            Principal principal) {
        return deviceService.getDevice(id, currentOwner(principal));
    }

    @PostMapping
    public ResponseEntity<DeviceResponse> createDevice(
            @RequestBody DeviceConfigurationRequest request,
            Principal principal) {

        DeviceResponse created = deviceService.create(
                currentOwner(principal),
                request);

        return ResponseEntity
                .created(URI.create("/api/devices/" + created.id()))
                .body(created);
    }

    @PatchMapping("/{id}")
    public DeviceResponse updateDevice(
            @PathVariable Long id,
            @RequestBody DeviceConfigurationRequest request,
            Principal principal) {
        return deviceService.update(
                id,
                currentOwner(principal),
                request);
    }

    @PostMapping("/{id}/connect")
    public DeviceResponse connectDevice(
            @PathVariable Long id,
            Principal principal) {
        return deviceService.connect(id, currentOwner(principal));
    }

    @PostMapping("/{id}/disconnect")
    public DeviceResponse disconnectDevice(
            @PathVariable Long id,
            Principal principal) {
        return deviceService.disconnect(id, currentOwner(principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDevice(
            @PathVariable Long id,
            Principal principal) {
        deviceService.delete(id, currentOwner(principal));
    }

    private String currentOwner(Principal principal) {
        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required");
        }

        return principal.getName();
    }
}
