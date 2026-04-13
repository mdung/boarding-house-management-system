package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CalendarEventDto {
    private String type; // CHECKIN, CHECKOUT, INVOICE_DUE, PAYMENT, OVERDUE
    private LocalDate date;
    private Long contractId;
    private Long tenantId;
    private String tenantName;
    private String roomCode;
    private String boardingHouseName;
    // Invoice/Payment specific
    private Long invoiceId;
    private String invoiceCode;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private String invoiceStatus;
    // Contract specific
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal dailyRate;
    private BigDecimal totalDebt;
}
