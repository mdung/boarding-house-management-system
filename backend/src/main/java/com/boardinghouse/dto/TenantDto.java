package com.boardinghouse.dto;

import com.boardinghouse.entity.TenantStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TenantDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private String identityNumber;
    private String passportNumber;
    private LocalDate dateOfBirth;
    private String permanentAddress;
    private TenantStatus status;

    // Active contract info for list display
    private Long activeContractId;
    private String activeRoomCode;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal totalDebt;       // tổng nợ (invoice + guest charges - paid)
    private BigDecimal totalCharges;    // tổng dịch vụ phát sinh
}

