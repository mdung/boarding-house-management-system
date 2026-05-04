package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.util.List;

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
    private Long boardingHouseId;
    private String boardingHouseName;
    /** Danh sách nguyên liệu định mức (recipe). Rỗng = bán 1:1 qua inventoryItemId */
    private List<ServiceCatalogRecipeDto> recipes;

    public ServiceCatalogDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getDefaultPrice() { return defaultPrice; }
    public void setDefaultPrice(BigDecimal defaultPrice) { this.defaultPrice = defaultPrice; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public Long getInventoryItemId() { return inventoryItemId; }
    public void setInventoryItemId(Long inventoryItemId) { this.inventoryItemId = inventoryItemId; }

    public String getInventoryItemName() { return inventoryItemName; }
    public void setInventoryItemName(String inventoryItemName) { this.inventoryItemName = inventoryItemName; }

    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }

    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

    public List<ServiceCatalogRecipeDto> getRecipes() { return recipes; }
    public void setRecipes(List<ServiceCatalogRecipeDto> recipes) { this.recipes = recipes; }
}
