package com.boardinghouse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
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
}

