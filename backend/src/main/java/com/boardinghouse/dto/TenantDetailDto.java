package com.boardinghouse.dto;

import com.boardinghouse.entity.TenantStatus;

import java.time.LocalDate;
import java.util.List;

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

    public TenantDetailDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getIdentityNumber() { return identityNumber; }
    public void setIdentityNumber(String identityNumber) { this.identityNumber = identityNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPermanentAddress() { return permanentAddress; }
    public void setPermanentAddress(String permanentAddress) { this.permanentAddress = permanentAddress; }

    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }

    public List<ContractDto> getContracts() { return contracts; }
    public void setContracts(List<ContractDto> contracts) { this.contracts = contracts; }

    public List<InvoiceDto> getInvoices() { return invoices; }
    public void setInvoices(List<InvoiceDto> invoices) { this.invoices = invoices; }

    public Long getTotalInvoices() { return totalInvoices; }
    public void setTotalInvoices(Long totalInvoices) { this.totalInvoices = totalInvoices; }

    public Long getUnpaidInvoices() { return unpaidInvoices; }
    public void setUnpaidInvoices(Long unpaidInvoices) { this.unpaidInvoices = unpaidInvoices; }
}
