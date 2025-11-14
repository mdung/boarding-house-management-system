package com.boardinghouse.dto;

import com.boardinghouse.entity.ServiceCategory;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ServiceTypeDto {
    private Long id;
    private String name;
    private ServiceCategory category;
    private String unit;
    private BigDecimal pricePerUnit;
    private Boolean isActive;
}

