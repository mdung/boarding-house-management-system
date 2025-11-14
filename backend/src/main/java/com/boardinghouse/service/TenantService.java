package com.boardinghouse.service;

import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.entity.Tenant;
import com.boardinghouse.entity.TenantStatus;
import com.boardinghouse.entity.User;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.TenantRepository;
import com.boardinghouse.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TenantService {
    private final TenantRepository repository;
    private final UserRepository userRepository;

    public TenantService(TenantRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public List<TenantDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public TenantDto getById(Long id) {
        Tenant tenant = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));
        return toDto(tenant);
    }

    public TenantDto getByUserId(Long userId) {
        Tenant tenant = repository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found for user id: " + userId));
        return toDto(tenant);
    }

    @Transactional
    public TenantDto create(TenantDto dto) {
        Tenant tenant = new Tenant();
        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            tenant.setUser(user);
        }
        tenant.setFullName(dto.getFullName());
        tenant.setPhone(dto.getPhone());
        tenant.setEmail(dto.getEmail());
        tenant.setIdentityNumber(dto.getIdentityNumber());
        tenant.setDateOfBirth(dto.getDateOfBirth());
        tenant.setPermanentAddress(dto.getPermanentAddress());
        tenant.setStatus(dto.getStatus() != null ? dto.getStatus() : TenantStatus.ACTIVE);
        return toDto(repository.save(tenant));
    }

    @Transactional
    public TenantDto update(Long id, TenantDto dto) {
        Tenant tenant = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));

        if (dto.getUserId() != null && (tenant.getUser() == null || !tenant.getUser().getId().equals(dto.getUserId()))) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            tenant.setUser(user);
        }

        tenant.setFullName(dto.getFullName());
        tenant.setPhone(dto.getPhone());
        tenant.setEmail(dto.getEmail());
        tenant.setIdentityNumber(dto.getIdentityNumber());
        tenant.setDateOfBirth(dto.getDateOfBirth());
        tenant.setPermanentAddress(dto.getPermanentAddress());
        if (dto.getStatus() != null) {
            tenant.setStatus(dto.getStatus());
        }
        return toDto(repository.save(tenant));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Tenant not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private TenantDto toDto(Tenant tenant) {
        TenantDto dto = new TenantDto();
        dto.setId(tenant.getId());
        dto.setUserId(tenant.getUser() != null ? tenant.getUser().getId() : null);
        dto.setFullName(tenant.getFullName());
        dto.setPhone(tenant.getPhone());
        dto.setEmail(tenant.getEmail());
        dto.setIdentityNumber(tenant.getIdentityNumber());
        dto.setDateOfBirth(tenant.getDateOfBirth());
        dto.setPermanentAddress(tenant.getPermanentAddress());
        dto.setStatus(tenant.getStatus());
        return dto;
    }
}

