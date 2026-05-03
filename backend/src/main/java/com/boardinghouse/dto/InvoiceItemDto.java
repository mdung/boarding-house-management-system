package com.boardinghouse.dto;

import com.boardinghouse.entity.InvoiceItemType;

import java.math.BigDecimal;

public class InvoiceItemDto {
    private Long id;
    private String description;
    private InvoiceItemType type;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private BigDecimal oldIndex;
    private BigDecimal newIndex;

    public InvoiceItemDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public InvoiceItemType getType() { return type; }
    public void setType(InvoiceItemType type) { this.type = type; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getOldIndex() { return oldIndex; }
    public void setOldIndex(BigDecimal oldIndex) { this.oldIndex = oldIndex; }

    public BigDecimal getNewIndex() { return newIndex; }
    public void setNewIndex(BigDecimal newIndex) { this.newIndex = newIndex; }
}
