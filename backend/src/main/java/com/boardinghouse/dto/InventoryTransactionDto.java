package com.boardinghouse.dto;

import com.boardinghouse.entity.InventoryTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class InventoryTransactionDto {
    private Long id;
    private Long itemId;
    private String itemName;
    private InventoryTransactionType type;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String reference;
    private String note;
    private LocalDate createdDate;
    private Long reversedByTransactionId;
    private boolean reversed; // true if this tx has been undone

    public InventoryTransactionDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public InventoryTransactionType getType() { return type; }
    public void setType(InventoryTransactionType type) { this.type = type; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDate getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDate createdDate) { this.createdDate = createdDate; }

    public Long getReversedByTransactionId() { return reversedByTransactionId; }
    public void setReversedByTransactionId(Long reversedByTransactionId) { this.reversedByTransactionId = reversedByTransactionId; }

    public boolean isReversed() { return reversed; }
    public void setReversed(boolean reversed) { this.reversed = reversed; }
}
