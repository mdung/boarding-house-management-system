package com.boardinghouse.controller;

import com.boardinghouse.dto.ContractDto;
import com.boardinghouse.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/contracts")
@CrossOrigin(origins = "*")
public class ContractController {
    private final ContractService service;
    private final com.boardinghouse.service.DetailService detailService;

    public ContractController(ContractService service, com.boardinghouse.service.DetailService detailService) {
        this.service = service;
        this.detailService = detailService;
    }

    @GetMapping
    public ResponseEntity<List<ContractDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContractDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ContractDto> create(@Valid @RequestBody ContractDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContractDto> update(@PathVariable Long id, @Valid @RequestBody ContractDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PostMapping("/{id}/terminate")
    public ResponseEntity<ContractDto> terminate(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        String reason = (String) request.get("reason");
        LocalDate terminationDate = request.get("terminationDate") != null ?
                LocalDate.parse(request.get("terminationDate").toString()) : LocalDate.now();
        return ResponseEntity.ok(service.terminate(id, reason, terminationDate));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<com.boardinghouse.dto.ContractDetailDto> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(detailService.getContractDetail(id));
    }
}

