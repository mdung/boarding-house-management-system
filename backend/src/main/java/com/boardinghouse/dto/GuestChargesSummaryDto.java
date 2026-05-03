package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class GuestChargesSummaryDto {
    private Long contractId;
    private String contractCode;
    private String roomCode;
    private String tenantName;

    // Contract info for display
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BigDecimal dailyRate;
    private BigDecimal deposit;

    private BigDecimal totalCharges;       // tổng tiền dịch vụ
    private BigDecimal totalRent;          // tiền phòng = dailyRate × số đêm
    private BigDecimal totalAmount;        // tổng cộng
    private BigDecimal totalPaid;          // đã thanh toán
    private BigDecimal remainingAmount;    // còn lại

    private List<GuestServiceChargeDto> charges;
    private Map<String, BigDecimal> chargesByDate;

    public GuestChargesSummaryDto() {}

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getContractCode() { return contractCode; }
    public void setContractCode(String contractCode) { this.contractCode = contractCode; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }

    public LocalDate getCheckInDate() { return checkInDate; }
    public void setCheckInDate(LocalDate checkInDate) { this.checkInDate = checkInDate; }

    public LocalDate getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }

    public Integer getTotalNights() { return totalNights; }
    public void setTotalNights(Integer totalNights) { this.totalNights = totalNights; }

    public BigDecimal getDailyRate() { return dailyRate; }
    public void setDailyRate(BigDecimal dailyRate) { this.dailyRate = dailyRate; }

    public BigDecimal getDeposit() { return deposit; }
    public void setDeposit(BigDecimal deposit) { this.deposit = deposit; }

    public BigDecimal getTotalCharges() { return totalCharges; }
    public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }

    public BigDecimal getTotalRent() { return totalRent; }
    public void setTotalRent(BigDecimal totalRent) { this.totalRent = totalRent; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }

    public List<GuestServiceChargeDto> getCharges() { return charges; }
    public void setCharges(List<GuestServiceChargeDto> charges) { this.charges = charges; }

    public Map<String, BigDecimal> getChargesByDate() { return chargesByDate; }
    public void setChargesByDate(Map<String, BigDecimal> chargesByDate) { this.chargesByDate = chargesByDate; }
}
