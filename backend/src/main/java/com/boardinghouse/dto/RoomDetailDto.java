package com.boardinghouse.dto;

import com.boardinghouse.entity.RoomStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RoomDetailDto {
    private Long id;
    private String code;
    private Long boardingHouseId;
    private String boardingHouseName;
    private String boardingHouseAddress;
    private Integer floor;
    private BigDecimal area;
    private Integer maxOccupants;
    private BigDecimal baseRent;
    private RoomStatus status;
    private List<RoomServiceDto> services;
    private ContractDto currentContract;
    private List<InvoiceDto> recentInvoices;
}

