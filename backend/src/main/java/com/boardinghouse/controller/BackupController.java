package com.boardinghouse.controller;

import com.boardinghouse.dto.BackupConfigDto;
import com.boardinghouse.dto.BackupHistoryDto;
import com.boardinghouse.service.BackupService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/backup")
@CrossOrigin(origins = "*")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    // ─── Config Endpoints ────────────────────────────────────────────────────

    /**
     * Lấy cấu hình backup hiện tại (emails, schedule, enabled).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/config")
    public ResponseEntity<BackupConfigDto> getConfig() {
        return ResponseEntity.ok(backupService.getConfig());
    }

    /**
     * Cập nhật cấu hình backup (emails, schedule, enabled).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/config")
    public ResponseEntity<BackupConfigDto> updateConfig(
            @RequestBody BackupConfigDto dto,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "unknown";
        BackupConfigDto updated = backupService.updateConfig(dto, username);
        return ResponseEntity.ok(updated);
    }

    // ─── Trigger Endpoint ────────────────────────────────────────────────────

    /**
     * Trigger manual backup ngay lập tức.
     * Chỉ ADMIN mới được phép.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/trigger")
    public ResponseEntity<BackupHistoryDto> triggerBackup(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "unknown";
        BackupHistoryDto result = backupService.triggerManualBackup(username);
        return ResponseEntity.ok(result);
    }

    // ─── History Endpoints ───────────────────────────────────────────────────

    /**
     * Lấy lịch sử backup với filter và phân trang.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/history")
    public ResponseEntity<Page<BackupHistoryDto>> getHistory(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String triggerType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<BackupHistoryDto> history = backupService.getHistory(status, triggerType, startDate, endDate, pageable);
        return ResponseEntity.ok(history);
    }

    /**
     * Lấy chi tiết 1 backup record.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/history/{id}")
    public ResponseEntity<BackupHistoryDto> getBackupDetail(@PathVariable Long id) {
        BackupHistoryDto dto = backupService.getById(id);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    /**
     * Lấy thống kê backup.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<BackupService.BackupStatsDto> getStats() {
        return ResponseEntity.ok(backupService.getStats());
    }
}
