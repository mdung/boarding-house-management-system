package com.boardinghouse.controller;

import com.boardinghouse.dto.InvoiceDto;
import com.boardinghouse.service.InvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {
    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<InvoiceDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<List<InvoiceDto>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(service.getByContract(contractId));
    }

    @PostMapping("/generate")
    public ResponseEntity<InvoiceDto> generateInvoice(@RequestBody Map<String, Object> request) {
        Long contractId = Long.valueOf(request.get("contractId").toString());
        Integer month = Integer.valueOf(request.get("month").toString());
        Integer year = Integer.valueOf(request.get("year").toString());
        return new ResponseEntity<>(service.generateInvoice(contractId, month, year), HttpStatus.CREATED);
    }

    @PostMapping("/generate-with-readings")
    public ResponseEntity<InvoiceDto> generateInvoiceWithReadings(@RequestBody com.boardinghouse.dto.GenerateInvoiceWithReadingsRequest request) {
        return new ResponseEntity<>(service.generateInvoiceWithReadings(request), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<com.boardinghouse.dto.InvoiceDetailDto> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(service.getDetailById(id));
    }
}

