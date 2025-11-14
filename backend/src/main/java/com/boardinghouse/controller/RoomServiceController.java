package com.boardinghouse.controller;

import com.boardinghouse.dto.RoomServiceDto;
import com.boardinghouse.service.RoomServiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/room-services")
@CrossOrigin(origins = "*")
public class RoomServiceController {
    private final RoomServiceService service;

    public RoomServiceController(RoomServiceService service) {
        this.service = service;
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<RoomServiceDto>> getByRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(service.getByRoom(roomId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomServiceDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping("/room/{roomId}")
    public ResponseEntity<RoomServiceDto> create(@PathVariable Long roomId, @Valid @RequestBody RoomServiceDto dto) {
        return new ResponseEntity<>(service.create(roomId, dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomServiceDto> update(@PathVariable Long id, @Valid @RequestBody RoomServiceDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

