package com.boardinghouse.dto;

import com.boardinghouse.entity.ServiceCategory;

import java.math.BigDecimal;

public class ServiceTypeDto {
    private Long id;
    private String name;
    private ServiceCategory category;
    private String unit;
    private BigDecimal pricePerUnit;
    private Boolean isActive;
    private Long boardingHouseId;
    private String boardingHouseName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ServiceCategory getCategory() { return category; }
    public void setCategory(ServiceCategory category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getPricePerUnit() { return pricePerUnit; }
    public void setPricePerUnit(BigDecimal pricePerUnit) { this.pricePerUnit = pricePerUnit; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }

    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }
}
