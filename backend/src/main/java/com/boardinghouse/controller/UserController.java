package com.boardinghouse.controller;

import com.boardinghouse.dto.ChangePasswordRequest;
import com.boardinghouse.dto.RegisterRequest;
import com.boardinghouse.dto.UserProfileDto;
import com.boardinghouse.entity.Role;
import com.boardinghouse.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserProfileDto>> getAllUsers() {
        return ResponseEntity.ok(service.getAllUsers());
    }

    @PostMapping("/admin/create-staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserProfileDto> createStaff(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.createStaff(request));
    }

    @PutMapping("/admin/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserProfileDto> updatePermissions(
            @PathVariable Long id,
            @RequestBody UpdatePermissionsRequest body) {
        
        List<String> roleStrings = body.getRoles() != null ? body.getRoles() : new java.util.ArrayList<>();
        List<String> permissions = body.getPermissions() != null ? body.getPermissions() : new java.util.ArrayList<>();
        
        Set<Role> roles = roleStrings.stream()
            .filter(r -> r != null && !r.isBlank())
            .map(r -> {
                try { return Role.valueOf(r); }
                catch (IllegalArgumentException e) { return null; }
            })
            .filter(r -> r != null)
            .collect(Collectors.toSet());
        
        Set<String> permSet = new java.util.HashSet<>(permissions);
        
        return ResponseEntity.ok(service.updateRolesAndPermissions(id, roles, permSet));
    }

    record UpdatePermissionsRequest(List<String> roles, List<String> permissions) {
        public List<String> getRoles() { return roles; }
        public List<String> getPermissions() { return permissions; }
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        service.deleteUser(id);
        return ResponseEntity.ok().build();
    }
}

