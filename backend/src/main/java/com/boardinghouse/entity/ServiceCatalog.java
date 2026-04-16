package com.boardinghouse.entity;

import com.boardinghouse.entity.InventoryItem;
import jakarta.persistence.FetchType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "service_catalog")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCatalog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // "Beer", "Coke", "Motorbike Rent"...

    @Column(nullable = false)
    private String category; // "FOOD_DRINK", "SERVICE"

    private String unit; // "bottle", "can", "day", "trip"...

    @Column(nullable = false)
    private BigDecimal defaultPrice;

    private String icon; // emoji icon
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id")
    private InventoryItem inventoryItem;
    private Boolean isActive = true;

    private Integer sortOrder = 0;
}
