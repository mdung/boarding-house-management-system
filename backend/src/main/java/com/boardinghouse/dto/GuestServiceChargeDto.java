package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class GuestServiceChargeDto {
    private Long id;
    private Long contractId;
    private String contractCode;
    private Long roomId;
    private String roomCode;
    private LocalDate chargeDate;
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String note;
    private LocalDate createdDate;
}
