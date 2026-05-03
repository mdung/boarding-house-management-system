package com.boardinghouse.dto;

import java.math.BigDecimal;

public class RevenueByMonthDto {
    private Integer month;
    private Integer year;
    private BigDecimal totalRevenue;
    private BigDecimal earnedRevenue;
    private BigDecimal earnedRoomRevenue;
    private BigDecimal earnedServiceRevenue;
    private BigDecimal uncollectedRevenue;
    private Long invoiceCount;
    private Long paidInvoiceCount;

    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public BigDecimal getEarnedRevenue() { return earnedRevenue; }
    public void setEarnedRevenue(BigDecimal earnedRevenue) { this.earnedRevenue = earnedRevenue; }

    public BigDecimal getEarnedRoomRevenue() { return earnedRoomRevenue; }
    public void setEarnedRoomRevenue(BigDecimal earnedRoomRevenue) { this.earnedRoomRevenue = earnedRoomRevenue; }

    public BigDecimal getEarnedServiceRevenue() { return earnedServiceRevenue; }
    public void setEarnedServiceRevenue(BigDecimal earnedServiceRevenue) { this.earnedServiceRevenue = earnedServiceRevenue; }

    public BigDecimal getUncollectedRevenue() { return uncollectedRevenue; }
    public void setUncollectedRevenue(BigDecimal uncollectedRevenue) { this.uncollectedRevenue = uncollectedRevenue; }

    public Long getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(Long invoiceCount) { this.invoiceCount = invoiceCount; }

    public Long getPaidInvoiceCount() { return paidInvoiceCount; }
    public void setPaidInvoiceCount(Long paidInvoiceCount) { this.paidInvoiceCount = paidInvoiceCount; }
}
