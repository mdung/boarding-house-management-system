package com.boardinghouse.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_catalog")
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "boarding_house_id")
    private BoardingHouse boardingHouse;

    private Boolean isActive = true;

    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "catalog", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ServiceCatalogRecipe> recipes = new ArrayList<>();

    public ServiceCatalog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getDefaultPrice() { return defaultPrice; }
    public void setDefaultPrice(BigDecimal defaultPrice) { this.defaultPrice = defaultPrice; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public InventoryItem getInventoryItem() { return inventoryItem; }
    public void setInventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; }

    public BoardingHouse getBoardingHouse() { return boardingHouse; }
    public void setBoardingHouse(BoardingHouse boardingHouse) { this.boardingHouse = boardingHouse; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public List<ServiceCatalogRecipe> getRecipes() { return recipes; }
    public void setRecipes(List<ServiceCatalogRecipe> recipes) { this.recipes = recipes; }
}
