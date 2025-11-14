package com.boardinghouse.dto;

import com.boardinghouse.entity.BillingCycle;
import com.boardinghouse.entity.ContractStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class ContractDto {
    private Long id;
    private String code;
    private Long roomId;
    private String roomCode;
    private Long mainTenantId;
    private String mainTenantName;
    private List<Long> tenantIds;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal deposit;
    private BigDecimal monthlyRent;
    private ContractStatus status;
    private BillingCycle billingCycle;
    private String terminationReason;
    private LocalDate terminationDate;
}

