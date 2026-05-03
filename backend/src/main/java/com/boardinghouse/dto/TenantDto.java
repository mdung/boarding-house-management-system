package com.boardinghouse.dto;

import com.boardinghouse.entity.TenantStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

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
    private Long activeBoardingHouseId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal totalDebt;       // tổng nợ (invoice + guest charges - paid)
    private BigDecimal totalCharges;    // tổng dịch vụ phát sinh

    public TenantDto() {}

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

    public String getPassportNumber() { return passportNumber; }
    public void setPassportNumber(String passportNumber) { this.passportNumber = passportNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPermanentAddress() { return permanentAddress; }
    public void setPermanentAddress(String permanentAddress) { this.permanentAddress = permanentAddress; }

    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }

    public Long getActiveContractId() { return activeContractId; }
    public void setActiveContractId(Long activeContractId) { this.activeContractId = activeContractId; }

    public String getActiveRoomCode() { return activeRoomCode; }
    public void setActiveRoomCode(String activeRoomCode) { this.activeRoomCode = activeRoomCode; }

    public Long getActiveBoardingHouseId() { return activeBoardingHouseId; }
    public void setActiveBoardingHouseId(Long activeBoardingHouseId) { this.activeBoardingHouseId = activeBoardingHouseId; }

    public LocalDate getCheckInDate() { return checkInDate; }
    public void setCheckInDate(LocalDate checkInDate) { this.checkInDate = checkInDate; }

    public LocalDate getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }

    public BigDecimal getTotalDebt() { return totalDebt; }
    public void setTotalDebt(BigDecimal totalDebt) { this.totalDebt = totalDebt; }

    public BigDecimal getTotalCharges() { return totalCharges; }
    public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }
}
