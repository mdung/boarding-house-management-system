package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class RevenueByMonthDto {
    private Integer month;
    private Integer year;
    private BigDecimal totalRevenue;
    private Long invoiceCount;
    private Long paidInvoiceCount;
}

