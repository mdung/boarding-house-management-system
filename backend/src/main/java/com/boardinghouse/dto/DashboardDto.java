package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class DashboardDto {
    private Long totalRooms;
    private Long occupiedRooms;
    private Long availableRooms;
    private Long maintenanceRooms;
    private BigDecimal monthlyRevenue;
    private BigDecimal roomRevenue;
    private BigDecimal serviceRevenue;
    private BigDecimal unpaidAmount;
    private Long overdueInvoices;
    private Long lowStockItems;
    private List<RevenueDetailDto> revenueDetails;

    private DayActivityDto yesterday;
    private DayActivityDto today;
    private DayActivityDto tomorrow;
    private List<GuestActivityDto> outstandingDebts; // checked-out guests with unpaid debt

    @Data
    public static class DayActivityDto {
        private List<GuestActivityDto> checkIns;
        private List<GuestActivityDto> checkOuts;
        private List<GuestActivityDto> staying;
    }

    @Data
    public static class GuestActivityDto {
        private Long contractId;
        private Long tenantId;
        private String tenantName;
        private String tenantPhone;
        private String roomCode;
        private String boardingHouseName;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private BigDecimal dailyRate;
        private Integer totalDays;
        private BigDecimal totalRoomCost;
        private BigDecimal totalCharges;
        private BigDecimal totalPaid;
        private BigDecimal totalDebt;
        private String activityType; // CHECKIN, CHECKOUT, STAYING
        private String contractStatus; // ACTIVE, EXPIRED, TERMINATED
        private boolean roomReleased; // true if room is AVAILABLE (already checked out)
    }

    @Data
    public static class RevenueDetailDto {
        private LocalDate date;
        private String invoiceCode;
        private String roomCode;
        private String tenantName;
        private String boardingHouseName;
        private String description;
        private String category;        // RENT or SERVICE
        private BigDecimal amount;
        private Long invoiceId;
    }
}

