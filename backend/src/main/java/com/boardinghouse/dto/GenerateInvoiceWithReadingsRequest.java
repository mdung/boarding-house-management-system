package com.boardinghouse.dto;

import java.util.List;

public class GenerateInvoiceWithReadingsRequest {
    private Long contractId;
    private Integer month;
    private Integer year;
    private List<UtilityReadingDto> readings;

    public GenerateInvoiceWithReadingsRequest() {}

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public List<UtilityReadingDto> getReadings() { return readings; }
    public void setReadings(List<UtilityReadingDto> readings) { this.readings = readings; }
}
