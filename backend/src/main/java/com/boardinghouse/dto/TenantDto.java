package com.boardinghouse.dto;

import com.boardinghouse.entity.TenantStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TenantDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private String identityNumber;
    private LocalDate dateOfBirth;
    private String permanentAddress;
    private TenantStatus status;
}

