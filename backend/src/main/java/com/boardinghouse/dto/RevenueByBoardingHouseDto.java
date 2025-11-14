package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class RevenueByBoardingHouseDto {
    private Long boardingHouseId;
    private String boardingHouseName;
    private BigDecimal totalRevenue;
    private Long invoiceCount;
    private Long paidInvoiceCount;
}

