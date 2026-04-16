package com.boardinghouse.dto;

import com.boardinghouse.entity.InventoryTransactionType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class InventoryTransactionDto {
    private Long id;
    private Long itemId;
    private String itemName;
    private InventoryTransactionType type;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String reference;
    private String note;
    private LocalDate createdDate;
}
