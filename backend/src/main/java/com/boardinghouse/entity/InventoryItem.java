package com.boardinghouse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "inventory_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    private String category;
    private String unit;

    @Column(nullable = false)
    private BigDecimal purchasePrice;

    @Column(nullable = false)
    private BigDecimal salePrice;

    @Column(nullable = false)
    private BigDecimal quantityOnHand = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    private Boolean isActive = true;
    private String note;
    private LocalDate createdDate = LocalDate.now();
}
