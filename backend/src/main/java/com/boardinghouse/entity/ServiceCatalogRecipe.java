package com.boardinghouse.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Định mức nguyên liệu cho 1 đơn vị service catalog.
 * VD: 1 Onion Ring = 0.2kg hành vòng + 0.05L dầu chiên
 */
@Entity
@Table(name = "service_catalog_recipes")
public class ServiceCatalogRecipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_id", nullable = false)
    private ServiceCatalog catalog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    /** Số lượng nguyên liệu cần dùng cho 1 đơn vị bán ra */
    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal quantityPerUnit;

    public ServiceCatalogRecipe() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ServiceCatalog getCatalog() { return catalog; }
    public void setCatalog(ServiceCatalog catalog) { this.catalog = catalog; }

    public InventoryItem getInventoryItem() { return inventoryItem; }
    public void setInventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; }

    public BigDecimal getQuantityPerUnit() { return quantityPerUnit; }
    public void setQuantityPerUnit(BigDecimal quantityPerUnit) { this.quantityPerUnit = quantityPerUnit; }
}
