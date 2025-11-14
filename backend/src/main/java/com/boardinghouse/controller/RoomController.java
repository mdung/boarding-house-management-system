package com.boardinghouse.controller;

import com.boardinghouse.dto.RoomDto;
import com.boardinghouse.dto.RoomServiceDto;
import com.boardinghouse.service.RoomService;
import com.boardinghouse.service.RoomServiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rooms")
@CrossOrigin(origins = "*")
public class RoomController {
    private final RoomService service;
    private final RoomServiceService roomServiceService;

    public RoomController(RoomService service, RoomServiceService roomServiceService) {
        this.service = service;
        this.roomServiceService = roomServiceService;
    }

    @GetMapping
    public ResponseEntity<List<RoomDto>> getAll(@RequestParam(required = false) Long boardingHouseId) {
        if (boardingHouseId != null) {
            return ResponseEntity.ok(service.getByBoardingHouse(boardingHouseId));
        }
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<RoomDto> create(@Valid @RequestBody RoomDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomDto> update(@PathVariable Long id, @Valid @RequestBody RoomDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{roomId}/services")
    public ResponseEntity<List<RoomServiceDto>> getRoomServices(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomServiceService.getByRoom(roomId));
    }
}

