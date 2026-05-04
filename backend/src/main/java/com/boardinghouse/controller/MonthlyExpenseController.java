package com.boardinghouse.controller;

import com.boardinghouse.dto.MonthlyExpenseDto;
import com.boardinghouse.service.MonthlyExpenseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/monthly-expenses")
public class MonthlyExpenseController {
    private final MonthlyExpenseService service;

    public MonthlyExpenseController(MonthlyExpenseService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<MonthlyExpenseDto>> getByMonth(
            @RequestParam(required = false) Long boardingHouseId,
            @RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(service.getByMonth(boardingHouseId, month, year));
    }

    @GetMapping("/year")
    public ResponseEntity<List<MonthlyExpenseDto>> getByYear(
            @RequestParam Long boardingHouseId, @RequestParam int year) {
        return ResponseEntity.ok(service.getByYear(boardingHouseId, year));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) Long boardingHouseId,
            @RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(service.getMonthlySummary(boardingHouseId, month, year));
    }

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getYears(@RequestParam Long boardingHouseId) {
        return ResponseEntity.ok(service.getAvailableYears(boardingHouseId));
    }

    @PostMapping
    public ResponseEntity<MonthlyExpenseDto> create(@RequestBody MonthlyExpenseDto dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MonthlyExpenseDto> update(@PathVariable Long id, @RequestBody MonthlyExpenseDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
