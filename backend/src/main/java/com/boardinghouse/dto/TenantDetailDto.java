package com.boardinghouse.dto;

import com.boardinghouse.entity.TenantStatus;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TenantDetailDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private String identityNumber;
    private LocalDate dateOfBirth;
    private String permanentAddress;
    private TenantStatus status;
    private List<ContractDto> contracts;
    private List<InvoiceDto> invoices;
    private Long totalInvoices;
    private Long unpaidInvoices;
}

