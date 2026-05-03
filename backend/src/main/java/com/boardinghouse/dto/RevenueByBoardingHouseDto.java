package com.boardinghouse.dto;

import java.math.BigDecimal;

public class RevenueByBoardingHouseDto {
    private Long boardingHouseId;
    private String boardingHouseName;
    private BigDecimal totalRevenue;
    private Long invoiceCount;
    private Long paidInvoiceCount;

    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }

    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public Long getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(Long invoiceCount) { this.invoiceCount = invoiceCount; }

    public Long getPaidInvoiceCount() { return paidInvoiceCount; }
    public void setPaidInvoiceCount(Long paidInvoiceCount) { this.paidInvoiceCount = paidInvoiceCount; }
}
