package com.boardinghouse.service;

import com.boardinghouse.dto.InventoryItemDto;
import com.boardinghouse.dto.InventoryTransactionDto;
import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.entity.InventoryItem;
import com.boardinghouse.entity.InventoryTransaction;
import com.boardinghouse.entity.InventoryTransactionType;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.BoardingHouseRepository;
import com.boardinghouse.repository.InventoryItemRepository;
import com.boardinghouse.repository.InventoryTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InventoryService {
    private final InventoryItemRepository itemRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final BoardingHouseRepository boardingHouseRepository;
    private final AuditLogService auditLogService;

    public InventoryService(InventoryItemRepository itemRepository,
                            InventoryTransactionRepository transactionRepository,
                            BoardingHouseRepository boardingHouseRepository,
                            AuditLogService auditLogService) {
        this.itemRepository = itemRepository;
        this.transactionRepository = transactionRepository;
        this.boardingHouseRepository = boardingHouseRepository;
        this.auditLogService = auditLogService;
    }

    public List<InventoryItemDto> getAll() {
        return itemRepository.findByIsActiveTrueOrderByCategoryAscNameAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** Items with no boarding house (global/shared) */
    public List<InventoryItemDto> getGlobalItems() {
        return itemRepository.findByBoardingHouseIsNullAndIsActiveTrueOrderByCategoryAscNameAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<InventoryItemDto> getAllIncludingInactive() {
        return itemRepository.findAll().stream()
                .sorted((a, b) -> {
                    int cat = compareNullable(a.getCategory(), b.getCategory());
                    return cat != 0 ? cat : compareNullable(a.getName(), b.getName());
                })
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDto> getByBoardingHouse(Long boardingHouseId) {
        return itemRepository.findByBoardingHouseIdAndIsActiveTrueOrderByCategoryAscNameAsc(boardingHouseId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<InventoryItemDto> getByBoardingHouseIncludingInactive(Long boardingHouseId) {
        return itemRepository.findByBoardingHouseIdOrderByCategoryAscNameAsc(boardingHouseId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public InventoryItemDto getById(Long id) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + id));
        return toDto(item);
    }

    @Transactional
    public InventoryItemDto create(InventoryItemDto dto) {
        InventoryItem item = new InventoryItem();
        InventoryItem saved = itemRepository.save(fromDto(item, dto));
        auditLogService.log("CREATE", "INVENTORY", "Created item: " + saved.getName() + " (SKU: " + saved.getSku() + ")"
                + (saved.getBoardingHouse() != null ? " for " + saved.getBoardingHouse().getName() : ""));
        return toDto(saved);
    }

    @Transactional
    public InventoryItemDto update(Long id, InventoryItemDto dto) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + id));
        InventoryItem saved = itemRepository.save(fromDto(item, dto));
        auditLogService.log("UPDATE", "INVENTORY", "Updated item: " + saved.getName());
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + id));
        item.setIsActive(false);
        itemRepository.save(item);
    }

    @Transactional
    public InventoryTransactionDto createTransaction(InventoryTransactionDto dto) {
        InventoryItem item = itemRepository.findById(dto.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found: " + dto.getItemId()));

        BigDecimal quantity = dto.getQuantity();
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) == 0)
            throw new BadRequestException("Quantity must not be zero");
        // ADJUSTMENT allows negative quantity (write-off / correction)
        if (dto.getType() != InventoryTransactionType.ADJUSTMENT && quantity.compareTo(BigDecimal.ZERO) < 0)
            throw new BadRequestException("Quantity must be greater than zero for " + dto.getType());
        if (dto.getUnitPrice() == null || dto.getUnitPrice().compareTo(BigDecimal.ZERO) < 0)
            throw new BadRequestException("Unit price must be set");
        if (dto.getType() == null)
            throw new BadRequestException("Transaction type is required");

        BigDecimal newQuantity = item.getQuantityOnHand();
        switch (dto.getType()) {
            case PURCHASE:
            case RETURN:
                newQuantity = newQuantity.add(quantity);
                break;
            case SALE:
                if (newQuantity.compareTo(quantity) < 0)
                    throw new BadRequestException("Insufficient stock. Available: " + newQuantity);
                newQuantity = newQuantity.subtract(quantity);
                break;
            case ADJUSTMENT:
                // quantity can be negative for write-offs/corrections
                newQuantity = newQuantity.add(quantity);
                if (newQuantity.compareTo(BigDecimal.ZERO) < 0)
                    throw new BadRequestException("Adjustment would result in negative stock. Current: " + item.getQuantityOnHand());
                break;
            default:
                throw new BadRequestException("Unknown transaction type");
        }

        item.setQuantityOnHand(newQuantity);
        itemRepository.save(item);
        auditLogService.log(dto.getType().name(), "INVENTORY",
                "Recorded " + dto.getType() + " for " + item.getName() + ": " + dto.getQuantity() + " " + item.getUnit());

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setItem(item);
        transaction.setType(dto.getType());
        transaction.setQuantity(quantity);
        transaction.setUnitPrice(dto.getUnitPrice());
        transaction.setAmount(dto.getUnitPrice().multiply(quantity));
        transaction.setReference(dto.getReference());
        transaction.setNote(dto.getNote());

        return toDto(transactionRepository.save(transaction));
    }

    public List<InventoryTransactionDto> getTransactions(Long itemId) {
        return transactionRepository.findByItemIdOrderByCreatedDateDesc(itemId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private InventoryItemDto toDto(InventoryItem item) {
        InventoryItemDto dto = new InventoryItemDto();
        dto.setId(item.getId());
        dto.setSku(item.getSku());
        dto.setName(item.getName());
        dto.setCategory(item.getCategory());
        dto.setUnit(item.getUnit());
        dto.setPurchasePrice(item.getPurchasePrice());
        dto.setSalePrice(item.getSalePrice());
        dto.setQuantityOnHand(item.getQuantityOnHand());
        dto.setReorderLevel(item.getReorderLevel());
        dto.setIsActive(item.getIsActive());
        dto.setNote(item.getNote());
        if (item.getBoardingHouse() != null) {
            dto.setBoardingHouseId(item.getBoardingHouse().getId());
            dto.setBoardingHouseName(item.getBoardingHouse().getName());
        }
        return dto;
    }

    private InventoryItem fromDto(InventoryItem item, InventoryItemDto dto) {
        item.setSku(dto.getSku());
        item.setName(dto.getName());
        item.setCategory(dto.getCategory());
        item.setUnit(dto.getUnit());
        item.setPurchasePrice(dto.getPurchasePrice());
        item.setSalePrice(dto.getSalePrice());
        item.setQuantityOnHand(dto.getQuantityOnHand() != null ? dto.getQuantityOnHand() : BigDecimal.ZERO);
        item.setReorderLevel(dto.getReorderLevel() != null ? dto.getReorderLevel() : BigDecimal.ZERO);
        item.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        item.setNote(dto.getNote());
        if (dto.getBoardingHouseId() != null) {
            BoardingHouse bh = boardingHouseRepository.findById(dto.getBoardingHouseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found: " + dto.getBoardingHouseId()));
            item.setBoardingHouse(bh);
        } else {
            item.setBoardingHouse(null);
        }
        return item;
    }

    private InventoryTransactionDto toDto(InventoryTransaction transaction) {
        InventoryTransactionDto dto = new InventoryTransactionDto();
        dto.setId(transaction.getId());
        dto.setItemId(transaction.getItem().getId());
        dto.setItemName(transaction.getItem().getName());
        dto.setType(transaction.getType());
        dto.setQuantity(transaction.getQuantity());
        dto.setUnitPrice(transaction.getUnitPrice());
        dto.setAmount(transaction.getAmount());
        dto.setReference(transaction.getReference());
        dto.setNote(transaction.getNote());
        dto.setCreatedDate(transaction.getCreatedDate());
        return dto;
    }

    private int compareNullable(String a, String b) {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        return a.compareTo(b);
    }
}
