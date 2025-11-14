package com.boardinghouse.dto;

import com.boardinghouse.entity.PaymentMethod;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentDto {
    private Long id;
    private Long invoiceId;
    private String invoiceCode;
    private BigDecimal paidAmount;
    private LocalDateTime paymentDate;
    private PaymentMethod method;
    private String note;
    private String transactionCode;
}

