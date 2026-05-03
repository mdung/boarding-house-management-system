package com.boardinghouse.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_types")
public class ServiceType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCategory category;

    private String unit;
    private BigDecimal pricePerUnit;
    private Boolean isActive = true;

    @OneToMany(mappedBy = "serviceType", cascade = CascadeType.ALL)
    private List<RoomService> roomServices = new ArrayList<>();

    public ServiceType() {}

    public ServiceType(Long id, String name, ServiceCategory category, String unit, BigDecimal pricePerUnit, Boolean isActive, List<RoomService> roomServices) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.pricePerUnit = pricePerUnit;
        this.isActive = isActive;
        this.roomServices = roomServices;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ServiceCategory getCategory() { return category; }
    public void setCategory(ServiceCategory category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getPricePerUnit() { return pricePerUnit; }
    public void setPricePerUnit(BigDecimal pricePerUnit) { this.pricePerUnit = pricePerUnit; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public List<RoomService> getRoomServices() { return roomServices; }
    public void setRoomServices(List<RoomService> roomServices) { this.roomServices = roomServices; }
}
