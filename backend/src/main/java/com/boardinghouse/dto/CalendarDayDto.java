package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class CalendarDayDto {
    private LocalDate date;
    private List<CalendarEventDto> events;

    public CalendarDayDto() {}

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public List<CalendarEventDto> getEvents() { return events; }
    public void setEvents(List<CalendarEventDto> events) { this.events = events; }

    public static class CalendarEventDto {
        private Long contractId;
        private Long tenantId;
        private String tenantName;
        private String tenantPhone;
        private String roomCode;
        private String boardingHouseName;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private String eventType; // CHECKIN, CHECKOUT, STAYING
        private BigDecimal dailyRate;
        private Integer totalDays;
        private BigDecimal totalDebt;
        private BigDecimal totalPaid;
        // Invoice info for the day's context
        private Integer unpaidInvoices;
        private BigDecimal unpaidAmount;

        public CalendarEventDto() {}

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

        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }

        public BigDecimal getDailyRate() { return dailyRate; }
        public void setDailyRate(BigDecimal dailyRate) { this.dailyRate = dailyRate; }

        public Integer getTotalDays() { return totalDays; }
        public void setTotalDays(Integer totalDays) { this.totalDays = totalDays; }

        public BigDecimal getTotalDebt() { return totalDebt; }
        public void setTotalDebt(BigDecimal totalDebt) { this.totalDebt = totalDebt; }

        public BigDecimal getTotalPaid() { return totalPaid; }
        public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

        public Integer getUnpaidInvoices() { return unpaidInvoices; }
        public void setUnpaidInvoices(Integer unpaidInvoices) { this.unpaidInvoices = unpaidInvoices; }

        public BigDecimal getUnpaidAmount() { return unpaidAmount; }
        public void setUnpaidAmount(BigDecimal unpaidAmount) { this.unpaidAmount = unpaidAmount; }
    }
}
