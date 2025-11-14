package com.boardinghouse.dto;

import com.boardinghouse.entity.PaymentStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class OutstandingDebtDto {
    private Long invoiceId;
    private String invoiceCode;
    private Long contractId;
    private String contractCode;
    private Long roomId;
    private String roomCode;
    private String tenantName;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private PaymentStatus status;
    private LocalDate dueDate;
    private Integer daysOverdue;
}

