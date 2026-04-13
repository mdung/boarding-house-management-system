package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CalendarDayDto {
    private LocalDate date;
    private List<CalendarEventDto> events;

    @Data
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
    }
}
