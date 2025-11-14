package com.boardinghouse.controller;

import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tenants")
@CrossOrigin(origins = "*")
public class TenantController {
    private final TenantService service;
    private final com.boardinghouse.service.DetailService detailService;

    public TenantController(TenantService service, com.boardinghouse.service.DetailService detailService) {
        this.service = service;
        this.detailService = detailService;
    }

    @GetMapping
    public ResponseEntity<List<TenantDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<TenantDto> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<TenantDto> create(@Valid @RequestBody TenantDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TenantDto> update(@PathVariable Long id, @Valid @RequestBody TenantDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<com.boardinghouse.dto.TenantDetailDto> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(detailService.getTenantDetail(id));
    }
}

