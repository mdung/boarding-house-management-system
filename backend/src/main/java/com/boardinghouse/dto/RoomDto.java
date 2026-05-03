package com.boardinghouse.dto;

import com.boardinghouse.entity.RoomStatus;

import java.math.BigDecimal;

public class RoomDto {
    private Long id;
    private String code;
    private Long boardingHouseId;
    private String boardingHouseName;
    private Integer floor;
    private BigDecimal area;
    private Integer maxOccupants;
    private BigDecimal baseRent;
    private RoomStatus status;
    private String currentTenantName;

    public RoomDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }

    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }

    public BigDecimal getArea() { return area; }
    public void setArea(BigDecimal area) { this.area = area; }

    public Integer getMaxOccupants() { return maxOccupants; }
    public void setMaxOccupants(Integer maxOccupants) { this.maxOccupants = maxOccupants; }

    public BigDecimal getBaseRent() { return baseRent; }
    public void setBaseRent(BigDecimal baseRent) { this.baseRent = baseRent; }

    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }

    public String getCurrentTenantName() { return currentTenantName; }
    public void setCurrentTenantName(String currentTenantName) { this.currentTenantName = currentTenantName; }
}
