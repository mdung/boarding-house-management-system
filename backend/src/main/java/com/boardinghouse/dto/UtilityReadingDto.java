package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UtilityReadingDto {
    private Long serviceTypeId;
    private BigDecimal oldIndex;
    private BigDecimal newIndex;
}

