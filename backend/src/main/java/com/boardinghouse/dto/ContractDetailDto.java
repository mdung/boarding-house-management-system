package com.boardinghouse.dto;

import com.boardinghouse.entity.BillingCycle;
import com.boardinghouse.entity.ContractStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ContractDetailDto {
    private Long id;
    private String code;
    private Long roomId;
    private String roomCode;
    private String boardingHouseName;
    private Long mainTenantId;
    private String mainTenantName;
    private String mainTenantPhone;
    private String mainTenantEmail;
    private List<TenantDto> tenants;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal deposit;
    private BigDecimal monthlyRent;
    private BigDecimal dailyRate;
    private ContractStatus status;
    private BillingCycle billingCycle;
    private String terminationReason;
    private LocalDate terminationDate;
    private List<InvoiceDto> invoices;
    private Long daysRemaining;

    public ContractDetailDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

    public Long getMainTenantId() { return mainTenantId; }
    public void setMainTenantId(Long mainTenantId) { this.mainTenantId = mainTenantId; }

    public String getMainTenantName() { return mainTenantName; }
    public void setMainTenantName(String mainTenantName) { this.mainTenantName = mainTenantName; }

    public String getMainTenantPhone() { return mainTenantPhone; }
    public void setMainTenantPhone(String mainTenantPhone) { this.mainTenantPhone = mainTenantPhone; }

    public String getMainTenantEmail() { return mainTenantEmail; }
    public void setMainTenantEmail(String mainTenantEmail) { this.mainTenantEmail = mainTenantEmail; }

    public List<TenantDto> getTenants() { return tenants; }
    public void setTenants(List<TenantDto> tenants) { this.tenants = tenants; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public BigDecimal getDeposit() { return deposit; }
    public void setDeposit(BigDecimal deposit) { this.deposit = deposit; }

    public BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    public BigDecimal getDailyRate() { return dailyRate; }
    public void setDailyRate(BigDecimal dailyRate) { this.dailyRate = dailyRate; }

    public ContractStatus getStatus() { return status; }
    public void setStatus(ContractStatus status) { this.status = status; }

    public BillingCycle getBillingCycle() { return billingCycle; }
    public void setBillingCycle(BillingCycle billingCycle) { this.billingCycle = billingCycle; }

    public String getTerminationReason() { return terminationReason; }
    public void setTerminationReason(String terminationReason) { this.terminationReason = terminationReason; }

    public LocalDate getTerminationDate() { return terminationDate; }
    public void setTerminationDate(LocalDate terminationDate) { this.terminationDate = terminationDate; }

    public List<InvoiceDto> getInvoices() { return invoices; }
    public void setInvoices(List<InvoiceDto> invoices) { this.invoices = invoices; }

    public Long getDaysRemaining() { return daysRemaining; }
    public void setDaysRemaining(Long daysRemaining) { this.daysRemaining = daysRemaining; }
}
