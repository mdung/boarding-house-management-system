package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ServiceRevenueDto {
    private String description;   // service name / category
    private BigDecimal totalAmount;
    private Long count;           // number of times charged
}
