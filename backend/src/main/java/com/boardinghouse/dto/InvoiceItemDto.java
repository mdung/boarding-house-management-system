package com.boardinghouse.dto;

import com.boardinghouse.entity.InvoiceItemType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InvoiceItemDto {
    private Long id;
    private String description;
    private InvoiceItemType type;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private BigDecimal oldIndex;
    private BigDecimal newIndex;
}

