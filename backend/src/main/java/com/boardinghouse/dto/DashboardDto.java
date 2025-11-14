package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class DashboardDto {
    private Long totalRooms;
    private Long occupiedRooms;
    private Long availableRooms;
    private Long maintenanceRooms;
    private BigDecimal monthlyRevenue;
    private BigDecimal unpaidAmount;
    private Long overdueInvoices;
}

