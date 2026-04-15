package com.boardinghouse.service;

import com.boardinghouse.dto.ServiceCatalogDto;
import com.boardinghouse.entity.ServiceCatalog;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.ServiceCatalogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceCatalogService {
    private final ServiceCatalogRepository repository;

    public ServiceCatalogService(ServiceCatalogRepository repository) {
        this.repository = repository;
    }

    public List<ServiceCatalogDto> getAll() {
        return repository.findByIsActiveTrueOrderByCategoryAscSortOrderAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ServiceCatalogDto> getAllIncludingInactive() {
        return repository.findAll().stream()
                .sorted((a, b) -> {
                    int cat = a.getCategory().compareTo(b.getCategory());
                    return cat != 0 ? cat : a.getSortOrder().compareTo(b.getSortOrder());
                })
                .map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public ServiceCatalogDto create(ServiceCatalogDto dto) {
        ServiceCatalog s = new ServiceCatalog();
        return toDto(repository.save(fromDto(s, dto)));
    }

    @Transactional
    public ServiceCatalogDto update(Long id, ServiceCatalogDto dto) {
        ServiceCatalog s = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        return toDto(repository.save(fromDto(s, dto)));
    }

    @Transactional
    public void delete(Long id) {
        ServiceCatalog s = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        s.setIsActive(false);
        repository.save(s);
    }

    private ServiceCatalog fromDto(ServiceCatalog s, ServiceCatalogDto dto) {
        s.setName(dto.getName());
        s.setCategory(dto.getCategory());
        s.setUnit(dto.getUnit());
        s.setDefaultPrice(dto.getDefaultPrice());
        s.setIcon(dto.getIcon());
        s.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        s.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        return s;
    }

    private ServiceCatalogDto toDto(ServiceCatalog s) {
        ServiceCatalogDto dto = new ServiceCatalogDto();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setCategory(s.getCategory());
        dto.setUnit(s.getUnit());
        dto.setDefaultPrice(s.getDefaultPrice());
        dto.setIcon(s.getIcon());
        dto.setIsActive(s.getIsActive());
        dto.setSortOrder(s.getSortOrder());
        return dto;
    }
}
