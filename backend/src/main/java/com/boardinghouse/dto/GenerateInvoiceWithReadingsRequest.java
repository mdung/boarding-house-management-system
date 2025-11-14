package com.boardinghouse.dto;

import lombok.Data;

import java.util.List;

@Data
public class GenerateInvoiceWithReadingsRequest {
    private Long contractId;
    private Integer month;
    private Integer year;
    private List<UtilityReadingDto> readings;
}

