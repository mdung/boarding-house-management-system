package com.boardinghouse.controller;

import com.boardinghouse.service.DeduplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/deduplication")
@CrossOrigin(origins = "*")
public class DeduplicationController {

    private final DeduplicationService service;

    public DeduplicationController(DeduplicationService service) {
        this.service = service;
    }

    /**
     * Scan for duplicates without deleting.
     * Returns duplicate groups for review.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/scan")
    public ResponseEntity<Map<String, Object>> scan() {
        return ResponseEntity.ok(service.scan());
    }

    /**
     * Remove duplicates safely.
     * Keeps the oldest record, reassigns FK references, then deletes duplicates.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/remove")
    public ResponseEntity<Map<String, Object>> remove() {
        Map<String, Object> stats = service.removeDuplicates();
        stats.put("success", true);
        stats.put("message", "Duplicates removed successfully. FK references reassigned to original records.");
        return ResponseEntity.ok(stats);
    }
}
