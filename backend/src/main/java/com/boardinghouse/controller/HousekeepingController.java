package com.boardinghouse.controller;

import com.boardinghouse.dto.HousekeepingTaskDto;
import com.boardinghouse.entity.HousekeepingTask;
import com.boardinghouse.service.HousekeepingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/housekeeping")
@CrossOrigin(origins = "*")
public class HousekeepingController {

    private final HousekeepingService service;

    public HousekeepingController(HousekeepingService service) {
        this.service = service;
    }

    /** GET /housekeeping?boardingHouseId=X&activeOnly=true */
    @GetMapping
    public ResponseEntity<List<HousekeepingTaskDto>> getAll(
            @RequestParam Long boardingHouseId,
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        if (activeOnly) return ResponseEntity.ok(service.getActive(boardingHouseId));
        return ResponseEntity.ok(service.getByBoardingHouse(boardingHouseId));
    }

    /** GET /housekeeping/room/:roomId */
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<HousekeepingTaskDto>> getByRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(service.getByRoom(roomId));
    }

    /** GET /housekeeping/:id */
    @GetMapping("/{id}")
    public ResponseEntity<HousekeepingTaskDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /** POST /housekeeping */
    @PostMapping
    public ResponseEntity<HousekeepingTaskDto> create(@RequestBody HousekeepingTaskDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    /**
     * POST /housekeeping/checkout/:contractId
     * Called by ContractController when a contract is marked as checked-out.
     */
    @PostMapping("/checkout/{contractId}")
    public ResponseEntity<HousekeepingTaskDto> createCheckoutTask(@PathVariable Long contractId) {
        HousekeepingTaskDto task = service.createCheckoutTask(contractId);
        if (task == null) return ResponseEntity.noContent().build(); // already exists
        return new ResponseEntity<>(task, HttpStatus.CREATED);
    }

    /** PUT /housekeeping/:id */
    @PutMapping("/{id}")
    public ResponseEntity<HousekeepingTaskDto> update(@PathVariable Long id, @RequestBody HousekeepingTaskDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    /** PATCH /housekeeping/:id/status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<HousekeepingTaskDto> updateStatus(@PathVariable Long id,
                                                             @RequestBody Map<String, String> body) {
        HousekeepingTask.TaskStatus status = HousekeepingTask.TaskStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(service.updateStatus(id, status));
    }

    /** DELETE /housekeeping/:id */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
