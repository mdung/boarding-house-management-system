package com.boardinghouse.dto;

import com.boardinghouse.entity.ServiceCategory;

import java.math.BigDecimal;

public class RoomServiceDto {
    private Long id;
    private Long roomId;
    private String roomCode;
    private Long serviceTypeId;
    private String serviceTypeName;
    private ServiceCategory serviceCategory;
    private BigDecimal pricePerUnit;
    private BigDecimal fixedPrice;

    public RoomServiceDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public Long getServiceTypeId() { return serviceTypeId; }
    public void setServiceTypeId(Long serviceTypeId) { this.serviceTypeId = serviceTypeId; }

    public String getServiceTypeName() { return serviceTypeName; }
    public void setServiceTypeName(String serviceTypeName) { this.serviceTypeName = serviceTypeName; }

    public ServiceCategory getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(ServiceCategory serviceCategory) { this.serviceCategory = serviceCategory; }

    public BigDecimal getPricePerUnit() { return pricePerUnit; }
    public void setPricePerUnit(BigDecimal pricePerUnit) { this.pricePerUnit = pricePerUnit; }

    public BigDecimal getFixedPrice() { return fixedPrice; }
    public void setFixedPrice(BigDecimal fixedPrice) { this.fixedPrice = fixedPrice; }
}
