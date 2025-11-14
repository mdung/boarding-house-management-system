package com.boardinghouse.dto;

import com.boardinghouse.entity.RoomStatus;
import lombok.Data;

import java.math.BigDecimal;

@Data
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
}

