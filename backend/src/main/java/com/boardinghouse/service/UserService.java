package com.boardinghouse.service;

import com.boardinghouse.dto.ChangePasswordRequest;
import com.boardinghouse.dto.UserProfileDto;
import com.boardinghouse.dto.RegisterRequest;
import com.boardinghouse.entity.Role;
import com.boardinghouse.entity.User;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public UserProfileDto getCurrentUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toProfileDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(UserProfileDto dto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFullName(dto.getFullName());
        user.setPhone(dto.getPhone());
        user.setEmail(dto.getEmail());
        user.setProfilePicture(dto.getProfilePicture());

        User saved = userRepository.save(user);
        auditLogService.log("UPDATE", "USER", "Updated profile for: " + saved.getUsername());
        return toProfileDto(saved);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public List<UserProfileDto> getAllUsers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r == Role.ADMIN || r == Role.STAFF))
                .map(this::toProfileDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserProfileDto createStaff(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.getRoles().add(Role.STAFF);
        user.setActive(true);
        User saved = userRepository.save(user);
        auditLogService.log("CREATE", "STAFF", "Created staff account: " + saved.getUsername());
        return toProfileDto(saved);
    }

    @Transactional
    public UserProfileDto updateRolesAndPermissions(Long userId, Set<Role> roles, Set<String> permissions) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setRoles(roles);
        user.setPermissions(permissions);
        User saved = userRepository.save(user);
        auditLogService.log("UPDATE_PERMISSIONS", "STAFF", "Updated roles/permissions for: " + saved.getUsername());
        return toProfileDto(saved);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRoles().contains(Role.ADMIN)) {
            throw new BadRequestException("Cannot deactivate an admin account");
        }
        user.setActive(false);
        userRepository.save(user);
        auditLogService.log("DEACTIVATE", "STAFF", "Deactivated account: " + user.getUsername());
    }

    private UserProfileDto toProfileDto(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setPhone(user.getPhone());
        dto.setEmail(user.getEmail());
        dto.setRoles(user.getRoles().stream()
                .map(Role::name)
                .collect(Collectors.toList()));
        dto.setPermissions(user.getPermissions() != null ? new java.util.ArrayList<>(user.getPermissions()) : new java.util.ArrayList<>());
        dto.setProfilePicture(user.getProfilePicture());
        return dto;
    }
}
