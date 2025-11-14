package com.boardinghouse.controller;

import com.boardinghouse.dto.BoardingHouseDto;
import com.boardinghouse.service.BoardingHouseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/boarding-houses")
@CrossOrigin(origins = "*")
public class BoardingHouseController {
    private final BoardingHouseService service;

    public BoardingHouseController(BoardingHouseService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<BoardingHouseDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BoardingHouseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<BoardingHouseDto> create(@Valid @RequestBody BoardingHouseDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BoardingHouseDto> update(@PathVariable Long id, @Valid @RequestBody BoardingHouseDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

