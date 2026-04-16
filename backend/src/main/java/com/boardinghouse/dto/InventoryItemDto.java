package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryItemDto {
    private Long id;
    private String sku;
    private String name;
    private String category;
    private String unit;
    private BigDecimal purchasePrice;
    private BigDecimal salePrice;
    private BigDecimal quantityOnHand;
    private BigDecimal reorderLevel;
    private Boolean isActive;
    private String note;
}
