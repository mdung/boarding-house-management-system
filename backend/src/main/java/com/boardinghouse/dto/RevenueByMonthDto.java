package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class RevenueByMonthDto {
    private Integer month;
    private Integer year;

    // Cash collected: sum of payments actually received this month
    private BigDecimal totalRevenue;

    // Earned revenue: room cost + service charges for contracts active this month
    private BigDecimal earnedRevenue;

    // Breakdown
    private BigDecimal earnedRoomRevenue;
    private BigDecimal earnedServiceRevenue;

    // Uncollected = earned - collected (still owed)
    private BigDecimal uncollectedRevenue;

    private Long invoiceCount;
    private Long paidInvoiceCount;
}

