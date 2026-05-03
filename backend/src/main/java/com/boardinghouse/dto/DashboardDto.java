package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

    public DashboardDto() {}

    public Long getTotalRooms() { return totalRooms; }
    public void setTotalRooms(Long totalRooms) { this.totalRooms = totalRooms; }

    public Long getOccupiedRooms() { return occupiedRooms; }
    public void setOccupiedRooms(Long occupiedRooms) { this.occupiedRooms = occupiedRooms; }

    public Long getAvailableRooms() { return availableRooms; }
    public void setAvailableRooms(Long availableRooms) { this.availableRooms = availableRooms; }

    public Long getMaintenanceRooms() { return maintenanceRooms; }
    public void setMaintenanceRooms(Long maintenanceRooms) { this.maintenanceRooms = maintenanceRooms; }

    public BigDecimal getMonthlyRevenue() { return monthlyRevenue; }
    public void setMonthlyRevenue(BigDecimal monthlyRevenue) { this.monthlyRevenue = monthlyRevenue; }

    public BigDecimal getRoomRevenue() { return roomRevenue; }
    public void setRoomRevenue(BigDecimal roomRevenue) { this.roomRevenue = roomRevenue; }

    public BigDecimal getServiceRevenue() { return serviceRevenue; }
    public void setServiceRevenue(BigDecimal serviceRevenue) { this.serviceRevenue = serviceRevenue; }

    public BigDecimal getUnpaidAmount() { return unpaidAmount; }
    public void setUnpaidAmount(BigDecimal unpaidAmount) { this.unpaidAmount = unpaidAmount; }

    public Long getOverdueInvoices() { return overdueInvoices; }
    public void setOverdueInvoices(Long overdueInvoices) { this.overdueInvoices = overdueInvoices; }

    public Long getLowStockItems() { return lowStockItems; }
    public void setLowStockItems(Long lowStockItems) { this.lowStockItems = lowStockItems; }

    public List<RevenueDetailDto> getRevenueDetails() { return revenueDetails; }
    public void setRevenueDetails(List<RevenueDetailDto> revenueDetails) { this.revenueDetails = revenueDetails; }

    public DayActivityDto getYesterday() { return yesterday; }
    public void setYesterday(DayActivityDto yesterday) { this.yesterday = yesterday; }

    public DayActivityDto getToday() { return today; }
    public void setToday(DayActivityDto today) { this.today = today; }

    public DayActivityDto getTomorrow() { return tomorrow; }
    public void setTomorrow(DayActivityDto tomorrow) { this.tomorrow = tomorrow; }

    public List<GuestActivityDto> getOutstandingDebts() { return outstandingDebts; }
    public void setOutstandingDebts(List<GuestActivityDto> outstandingDebts) { this.outstandingDebts = outstandingDebts; }

    public static class DayActivityDto {
        private List<GuestActivityDto> checkIns;
        private List<GuestActivityDto> checkOuts;
        private List<GuestActivityDto> staying;

        public DayActivityDto() {}

        public List<GuestActivityDto> getCheckIns() { return checkIns; }
        public void setCheckIns(List<GuestActivityDto> checkIns) { this.checkIns = checkIns; }

        public List<GuestActivityDto> getCheckOuts() { return checkOuts; }
        public void setCheckOuts(List<GuestActivityDto> checkOuts) { this.checkOuts = checkOuts; }

        public List<GuestActivityDto> getStaying() { return staying; }
        public void setStaying(List<GuestActivityDto> staying) { this.staying = staying; }
    }

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

        public GuestActivityDto() {}

        public Long getContractId() { return contractId; }
        public void setContractId(Long contractId) { this.contractId = contractId; }

        public Long getTenantId() { return tenantId; }
        public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

        public String getTenantName() { return tenantName; }
        public void setTenantName(String tenantName) { this.tenantName = tenantName; }

        public String getTenantPhone() { return tenantPhone; }
        public void setTenantPhone(String tenantPhone) { this.tenantPhone = tenantPhone; }

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

        public String getBoardingHouseName() { return boardingHouseName; }
        public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

        public LocalDate getCheckInDate() { return checkInDate; }
        public void setCheckInDate(LocalDate checkInDate) { this.checkInDate = checkInDate; }

        public LocalDate getCheckOutDate() { return checkOutDate; }
        public void setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }

        public BigDecimal getDailyRate() { return dailyRate; }
        public void setDailyRate(BigDecimal dailyRate) { this.dailyRate = dailyRate; }

        public Integer getTotalDays() { return totalDays; }
        public void setTotalDays(Integer totalDays) { this.totalDays = totalDays; }

        public BigDecimal getTotalRoomCost() { return totalRoomCost; }
        public void setTotalRoomCost(BigDecimal totalRoomCost) { this.totalRoomCost = totalRoomCost; }

        public BigDecimal getTotalCharges() { return totalCharges; }
        public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }

        public BigDecimal getTotalPaid() { return totalPaid; }
        public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

        public BigDecimal getTotalDebt() { return totalDebt; }
        public void setTotalDebt(BigDecimal totalDebt) { this.totalDebt = totalDebt; }

        public String getActivityType() { return activityType; }
        public void setActivityType(String activityType) { this.activityType = activityType; }

        public String getContractStatus() { return contractStatus; }
        public void setContractStatus(String contractStatus) { this.contractStatus = contractStatus; }

        public boolean isRoomReleased() { return roomReleased; }
        public void setRoomReleased(boolean roomReleased) { this.roomReleased = roomReleased; }
    }

    public static class RevenueDetailDto {
        private LocalDate date;
        private String invoiceCode;
        private String roomCode;
        private String tenantName;
        private String boardingHouseName;
        private String description;
        private String category;        // RENT or SERVICE
        private BigDecimal amount;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private Long invoiceId;

        public RevenueDetailDto() {}

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }

        public String getInvoiceCode() { return invoiceCode; }
        public void setInvoiceCode(String invoiceCode) { this.invoiceCode = invoiceCode; }

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

        public String getTenantName() { return tenantName; }
        public void setTenantName(String tenantName) { this.tenantName = tenantName; }

        public String getBoardingHouseName() { return boardingHouseName; }
        public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

        public Long getInvoiceId() { return invoiceId; }
        public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }
    }
}
