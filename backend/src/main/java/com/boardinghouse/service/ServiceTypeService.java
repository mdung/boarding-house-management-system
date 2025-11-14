package com.boardinghouse.service;

import com.boardinghouse.dto.ServiceTypeDto;
import com.boardinghouse.entity.ServiceType;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.ServiceTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceTypeService {
    private final ServiceTypeRepository repository;

    public ServiceTypeService(ServiceTypeRepository repository) {
        this.repository = repository;
    }

    public List<ServiceTypeDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<ServiceTypeDto> getActive() {
        return repository.findByIsActiveTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ServiceTypeDto getById(Long id) {
        ServiceType serviceType = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service type not found with id: " + id));
        return toDto(serviceType);
    }

    @Transactional
    public ServiceTypeDto create(ServiceTypeDto dto) {
        ServiceType serviceType = new ServiceType();
        serviceType.setName(dto.getName());
        serviceType.setCategory(dto.getCategory());
        serviceType.setUnit(dto.getUnit());
        serviceType.setPricePerUnit(dto.getPricePerUnit());
        serviceType.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        return toDto(repository.save(serviceType));
    }

    @Transactional
    public ServiceTypeDto update(Long id, ServiceTypeDto dto) {
        ServiceType serviceType = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service type not found with id: " + id));
        serviceType.setName(dto.getName());
        serviceType.setCategory(dto.getCategory());
        serviceType.setUnit(dto.getUnit());
        serviceType.setPricePerUnit(dto.getPricePerUnit());
        if (dto.getIsActive() != null) {
            serviceType.setIsActive(dto.getIsActive());
        }
        return toDto(repository.save(serviceType));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Service type not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private ServiceTypeDto toDto(ServiceType serviceType) {
        ServiceTypeDto dto = new ServiceTypeDto();
        dto.setId(serviceType.getId());
        dto.setName(serviceType.getName());
        dto.setCategory(serviceType.getCategory());
        dto.setUnit(serviceType.getUnit());
        dto.setPricePerUnit(serviceType.getPricePerUnit());
        dto.setIsActive(serviceType.getIsActive());
        return dto;
    }
}

