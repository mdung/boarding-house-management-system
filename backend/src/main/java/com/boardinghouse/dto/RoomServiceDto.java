package com.boardinghouse.dto;

import com.boardinghouse.entity.ServiceCategory;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RoomServiceDto {
    private Long id;
    private Long roomId;
    private String roomCode;
    private Long serviceTypeId;
    private String serviceTypeName;
    private ServiceCategory serviceCategory;
    private BigDecimal pricePerUnit;
    private BigDecimal fixedPrice;
}

