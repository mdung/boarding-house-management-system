package com.boardinghouse.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "inventory_transactions")
public class InventoryTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InventoryTransactionType type;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private BigDecimal amount;

    private String reference;
    private String note;
    private LocalDate createdDate = LocalDate.now();

    /** ID of the reverse transaction that undid this one. Null = not reversed. */
    private Long reversedByTransactionId;

    public InventoryTransaction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public InventoryItem getItem() { return item; }
    public void setItem(InventoryItem item) { this.item = item; }

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
}
