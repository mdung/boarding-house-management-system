package com.boardinghouse.controller;

import com.boardinghouse.dto.DataExportDto;
import com.boardinghouse.service.DataTransferService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/data-transfer")
@CrossOrigin(origins = "*")
public class DataTransferController {

    private final DataTransferService dataTransferService;

    public DataTransferController(DataTransferService dataTransferService) {
        this.dataTransferService = dataTransferService;
    }

    /**
     * Export toàn bộ data thành JSON.
     * Chỉ ADMIN mới được phép.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/export")
    public ResponseEntity<DataExportDto> exportData(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "unknown";
        DataExportDto data = dataTransferService.exportAll(username);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"boarding-house-backup-" +
                        java.time.LocalDate.now() + ".json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(data);
    }

    /**
     * Import data từ file JSON đã export trước đó.
     * CẢNH BÁO: Xóa toàn bộ data hiện tại và thay bằng data mới.
     * Chỉ ADMIN mới được phép.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importData(@RequestBody DataExportDto data) {
        Map<String, Object> stats = dataTransferService.importAll(data);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Import thành công",
                "imported", stats
        ));
    }
}
