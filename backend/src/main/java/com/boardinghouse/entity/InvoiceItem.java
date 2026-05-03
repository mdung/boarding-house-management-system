package com.boardinghouse.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
public class InvoiceItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceItemType type;

    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;

    // For utility readings
    private BigDecimal oldIndex;
    private BigDecimal newIndex;

    public InvoiceItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

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
