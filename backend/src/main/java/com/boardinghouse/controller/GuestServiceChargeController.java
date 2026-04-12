package com.boardinghouse.controller;

import com.boardinghouse.dto.GuestChargesSummaryDto;
import com.boardinghouse.dto.GuestServiceChargeDto;
import com.boardinghouse.service.GuestServiceChargeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/guest-charges")
public class GuestServiceChargeController {

    private final GuestServiceChargeService service;

    public GuestServiceChargeController(GuestServiceChargeService service) {
        this.service = service;
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<List<GuestServiceChargeDto>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(service.getByContract(contractId));
    }

    @GetMapping("/contract/{contractId}/summary")
    public ResponseEntity<GuestChargesSummaryDto> getSummary(@PathVariable Long contractId) {
        return ResponseEntity.ok(service.getSummary(contractId));
    }

    @PostMapping
    public ResponseEntity<GuestServiceChargeDto> create(@RequestBody GuestServiceChargeDto dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
