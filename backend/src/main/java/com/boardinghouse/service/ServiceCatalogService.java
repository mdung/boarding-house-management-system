package com.boardinghouse.service;

import com.boardinghouse.dto.ServiceCatalogDto;
import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.entity.InventoryItem;
import com.boardinghouse.entity.ServiceCatalog;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.BoardingHouseRepository;
import com.boardinghouse.repository.InventoryItemRepository;
import com.boardinghouse.repository.ServiceCatalogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceCatalogService {
    private final ServiceCatalogRepository repository;
    private final InventoryItemRepository inventoryItemRepository;
    private final BoardingHouseRepository boardingHouseRepository;

    public ServiceCatalogService(ServiceCatalogRepository repository,
                                 InventoryItemRepository inventoryItemRepository,
                                 BoardingHouseRepository boardingHouseRepository) {
        this.repository = repository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.boardingHouseRepository = boardingHouseRepository;
    }

    /** Active items for a specific boarding house only (not global) */
    public List<ServiceCatalogDto> getByBoardingHouse(Long boardingHouseId) {
        if (boardingHouseId == null) {
            // No boardingHouseId → return only global items (boardingHouse IS NULL)
            return repository.findByBoardingHouseIsNullAndIsActiveTrueOrderByCategoryAscSortOrderAsc()
                    .stream().map(this::toDto).collect(Collectors.toList());
        }
        // Only return items belonging to this specific boarding house (not global)
        return repository.findActiveByBoardingHouseOnly(boardingHouseId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ServiceCatalogDto> getAll() {
        return repository.findByIsActiveTrueOrderByCategoryAscSortOrderAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** For management page: show items of specific property only, or all if no filter */
    public List<ServiceCatalogDto> getAllIncludingInactive(Long boardingHouseId) {
        if (boardingHouseId != null) {
            // Only show items belonging to this boarding house
            return repository.findAllByBoardingHouseOnly(boardingHouseId)
                    .stream().map(this::toDto).collect(Collectors.toList());
        }
        return repository.findAll().stream()
                .sorted((a, b) -> {
                    int cat = a.getCategory().compareTo(b.getCategory());
                    return cat != 0 ? cat : a.getSortOrder().compareTo(b.getSortOrder());
                })
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<ServiceCatalogDto> getAllIncludingInactive() {
        return getAllIncludingInactive(null);
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
        if (dto.getInventoryItemId() != null) {
            InventoryItem inventoryItem = inventoryItemRepository.findById(dto.getInventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + dto.getInventoryItemId()));
            s.setInventoryItem(inventoryItem);
        } else {
            s.setInventoryItem(null);
        }
        if (dto.getBoardingHouseId() != null) {
            BoardingHouse bh = boardingHouseRepository.findById(dto.getBoardingHouseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found: " + dto.getBoardingHouseId()));
            s.setBoardingHouse(bh);
        } else {
            s.setBoardingHouse(null);
        }
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
        if (s.getInventoryItem() != null) {
            dto.setInventoryItemId(s.getInventoryItem().getId());
            dto.setInventoryItemName(s.getInventoryItem().getName());
        }
        if (s.getBoardingHouse() != null) {
            dto.setBoardingHouseId(s.getBoardingHouse().getId());
            dto.setBoardingHouseName(s.getBoardingHouse().getName());
        }
        return dto;
    }
}
