package com.boardinghouse.controller;

import com.boardinghouse.dto.InventoryItemDto;
import com.boardinghouse.dto.InventoryTransactionDto;
import com.boardinghouse.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * GET /inventory/items?boardingHouseId=1  → items của nhà trọ 1 (active only)
     * GET /inventory/items                    → chỉ items không thuộc nhà trọ nào (global/legacy)
     */
    @GetMapping("/items")
    public ResponseEntity<List<InventoryItemDto>> getItems(
            @RequestParam(required = false) Long boardingHouseId) {
        if (boardingHouseId != null) {
            return ResponseEntity.ok(inventoryService.getByBoardingHouse(boardingHouseId));
        }
        // No boardingHouseId → return only global items (boardingHouse IS NULL)
        return ResponseEntity.ok(inventoryService.getGlobalItems());
    }

    /**
     * GET /inventory/items/all?boardingHouseId=1  → bao gồm inactive
     * GET /inventory/items/all                    → tất cả items (admin view)
     */
    @GetMapping("/items/all")
    public ResponseEntity<List<InventoryItemDto>> getItemsIncludingInactive(
            @RequestParam(required = false) Long boardingHouseId) {
        if (boardingHouseId != null) {
            return ResponseEntity.ok(inventoryService.getByBoardingHouseIncludingInactive(boardingHouseId));
        }
        return ResponseEntity.ok(inventoryService.getAllIncludingInactive());
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<InventoryItemDto> getItemById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getById(id));
    }

    @PostMapping("/items")
    public ResponseEntity<InventoryItemDto> createItem(@RequestBody InventoryItemDto dto) {
        return ResponseEntity.ok(inventoryService.create(dto));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<InventoryItemDto> updateItem(@PathVariable Long id, @RequestBody InventoryItemDto dto) {
        return ResponseEntity.ok(inventoryService.update(id, dto));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<InventoryTransactionDto>> getTransactions(@RequestParam Long itemId) {
        return ResponseEntity.ok(inventoryService.getTransactions(itemId));
    }

    @PostMapping("/transactions")
    public ResponseEntity<InventoryTransactionDto> createTransaction(@RequestBody InventoryTransactionDto dto) {
        return ResponseEntity.ok(inventoryService.createTransaction(dto));
    }
}
