package com.boardinghouse.controller;

import com.boardinghouse.dto.ServiceTypeDto;
import com.boardinghouse.service.ServiceTypeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/service-types")
@CrossOrigin(origins = "*")
public class ServiceTypeController {
    private final ServiceTypeService service;

    public ServiceTypeController(ServiceTypeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ServiceTypeDto>> getAll(@RequestParam(required = false) Boolean active) {
        if (active != null && active) {
            return ResponseEntity.ok(service.getActive());
        }
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceTypeDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ServiceTypeDto> create(@Valid @RequestBody ServiceTypeDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceTypeDto> update(@PathVariable Long id, @Valid @RequestBody ServiceTypeDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

