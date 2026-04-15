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
    public ResponseEntity<List<ServiceCatalogDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/all")
    public ResponseEntity<List<ServiceCatalogDto>> getAllIncludingInactive() {
        return ResponseEntity.ok(service.getAllIncludingInactive());
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
}
