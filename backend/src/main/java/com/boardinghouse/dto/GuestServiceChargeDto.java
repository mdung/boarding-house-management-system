package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class GuestServiceChargeDto {
    private Long id;
    private Long contractId;
    private String contractCode;
    private Long roomId;
    private String roomCode;
    private Long inventoryItemId;
    private String inventoryItemName;
    private Long catalogId; // optional: catalog used to generate this charge (for recipe deduction)
    private LocalDate chargeDate;
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String note;
    private LocalDate createdDate;

    public GuestServiceChargeDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getContractCode() { return contractCode; }
    public void setContractCode(String contractCode) { this.contractCode = contractCode; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public Long getInventoryItemId() { return inventoryItemId; }
    public void setInventoryItemId(Long inventoryItemId) { this.inventoryItemId = inventoryItemId; }

    public String getInventoryItemName() { return inventoryItemName; }
    public void setInventoryItemName(String inventoryItemName) { this.inventoryItemName = inventoryItemName; }

    public Long getCatalogId() { return catalogId; }
    public void setCatalogId(Long catalogId) { this.catalogId = catalogId; }

    public LocalDate getChargeDate() { return chargeDate; }
    public void setChargeDate(LocalDate chargeDate) { this.chargeDate = chargeDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDate getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDate createdDate) { this.createdDate = createdDate; }
}
