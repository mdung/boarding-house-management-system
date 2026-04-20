package com.boardinghouse.controller;

import com.boardinghouse.dto.DashboardDto;
import com.boardinghouse.service.DashboardService;
import com.boardinghouse.service.CalendarService;
import com.boardinghouse.dto.CalendarDayDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {
    private final DashboardService service;
    private final CalendarService calendarService;

    public DashboardController(DashboardService service, CalendarService calendarService) {
        this.service = service;
        this.calendarService = calendarService;
    }

    @GetMapping
    public ResponseEntity<DashboardDto> getDashboard() {
        return ResponseEntity.ok(service.getDashboard());
    }

    @GetMapping("/day")
    public ResponseEntity<DashboardDto.DayActivityDto> getDayActivity(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(service.getDayActivity(date));
    }

    @GetMapping("/calendar")
    public ResponseEntity<List<CalendarDayDto>> getCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(calendarService.getCalendarData(startDate, endDate));
    }
}

