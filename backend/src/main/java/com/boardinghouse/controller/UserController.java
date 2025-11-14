package com.boardinghouse.controller;

import com.boardinghouse.dto.ChangePasswordRequest;
import com.boardinghouse.dto.UserProfileDto;
import com.boardinghouse.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileDto> getProfile() {
        return ResponseEntity.ok(service.getCurrentUserProfile());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileDto> updateProfile(@Valid @RequestBody UserProfileDto dto) {
        return ResponseEntity.ok(service.updateProfile(dto));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        service.changePassword(request);
        return ResponseEntity.ok().build();
    }
}

