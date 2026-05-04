package com.boardinghouse.controller;

import com.boardinghouse.dto.ServiceCatalogDto;
import com.boardinghouse.service.ServiceCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/service-catalog")
public class ServiceCatalogController {
    private final ServiceCatalogService service;

    public ServiceCatalogController(ServiceCatalogService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ServiceCatalogDto>> getAll(
            @RequestParam(required = false) Long boardingHouseId) {
        return ResponseEntity.ok(service.getByBoardingHouse(boardingHouseId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<ServiceCatalogDto>> getAllIncludingInactive(
            @RequestParam(required = false) Long boardingHouseId) {
        return ResponseEntity.ok(service.getAllIncludingInactive(boardingHouseId));
    }

    @PostMapping
    public ResponseEntity<ServiceCatalogDto> create(@RequestBody ServiceCatalogDto dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceCatalogDto> update(@PathVariable Long id, @RequestBody ServiceCatalogDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Auto-link SC items with inventory items by matching name within same boarding house */
    @PostMapping("/auto-link")
    public ResponseEntity<Integer> autoLink(@RequestParam(required = false) Long boardingHouseId) {
        int linked = service.autoLinkInventory(boardingHouseId);
        return ResponseEntity.ok(linked);
    }
}
