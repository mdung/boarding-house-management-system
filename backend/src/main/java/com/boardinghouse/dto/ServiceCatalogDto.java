package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ServiceCatalogDto {
    private Long id;
    private String name;
    private String category;
    private String unit;
    private BigDecimal defaultPrice;
    private String icon;
    private Boolean isActive;
    private Integer sortOrder;
    private Long inventoryItemId;
    private String inventoryItemName;
}
