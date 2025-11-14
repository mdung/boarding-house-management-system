package com.boardinghouse.dto;

import com.boardinghouse.entity.PaymentStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class InvoiceDto {
    private Long id;
    private String code;
    private Long contractId;
    private String contractCode;
    private Long roomId;
    private String roomCode;
    private Integer periodMonth;
    private Integer periodYear;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private PaymentStatus status;
    private LocalDate dueDate;
    private LocalDate createdDate;
    private List<InvoiceItemDto> items;
}

