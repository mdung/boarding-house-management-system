package com.boardinghouse.controller;

import com.boardinghouse.dto.OutstandingDebtDto;
import com.boardinghouse.dto.RevenueByBoardingHouseDto;
import com.boardinghouse.dto.RevenueByMonthDto;
import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.service.ReportsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/reports")
@CrossOrigin(origins = "*")
public class ReportsController {
    private final ReportsService service;

    public ReportsController(ReportsService service) {
        this.service = service;
    }

    @GetMapping("/revenue-by-month")
    public ResponseEntity<List<RevenueByMonthDto>> getRevenueByMonth(
            @RequestParam(required = false) Integer year) {
        if (year == null) {
            year = LocalDate.now().getYear();
        }
        return ResponseEntity.ok(service.getRevenueByMonth(year));
    }

    @GetMapping("/revenue-by-boarding-house")
    public ResponseEntity<List<RevenueByBoardingHouseDto>> getRevenueByBoardingHouse(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(service.getRevenueByBoardingHouse(startDate, endDate));
    }

    @GetMapping("/tenants-currently-renting")
    public ResponseEntity<List<TenantDto>> getTenantsCurrentlyRenting() {
        return ResponseEntity.ok(service.getTenantsCurrentlyRenting());
    }

    @GetMapping("/outstanding-debts")
    public ResponseEntity<List<OutstandingDebtDto>> getOutstandingDebts() {
        return ResponseEntity.ok(service.getOutstandingDebts());
    }
}

