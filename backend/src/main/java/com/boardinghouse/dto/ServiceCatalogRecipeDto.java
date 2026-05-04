package com.boardinghouse.dto;

import java.math.BigDecimal;

public class ServiceCatalogRecipeDto {
    private Long id;
    private Long inventoryItemId;
    private String inventoryItemName;
    private String inventoryItemUnit;
    private BigDecimal quantityPerUnit;

    public ServiceCatalogRecipeDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getInventoryItemId() { return inventoryItemId; }
    public void setInventoryItemId(Long inventoryItemId) { this.inventoryItemId = inventoryItemId; }

    public String getInventoryItemName() { return inventoryItemName; }
    public void setInventoryItemName(String inventoryItemName) { this.inventoryItemName = inventoryItemName; }

    public String getInventoryItemUnit() { return inventoryItemUnit; }
    public void setInventoryItemUnit(String inventoryItemUnit) { this.inventoryItemUnit = inventoryItemUnit; }

    public BigDecimal getQuantityPerUnit() { return quantityPerUnit; }
    public void setQuantityPerUnit(BigDecimal quantityPerUnit) { this.quantityPerUnit = quantityPerUnit; }
}
