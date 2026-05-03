package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ServiceRevenueDto {
    private String description;
    private BigDecimal totalAmount;
    private Long count;
    private List<DetailItem> items;

    public ServiceRevenueDto() {}

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Long getCount() { return count; }
    public void setCount(Long count) { this.count = count; }

    public List<DetailItem> getItems() { return items; }
    public void setItems(List<DetailItem> items) { this.items = items; }

    public static class DetailItem {
        private LocalDate chargeDate;
        private String tenantName;
        private String roomCode;
        private String boardingHouseName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
        private String note;

        public DetailItem() {}

        public LocalDate getChargeDate() { return chargeDate; }
        public void setChargeDate(LocalDate chargeDate) { this.chargeDate = chargeDate; }

        public String getTenantName() { return tenantName; }
        public void setTenantName(String tenantName) { this.tenantName = tenantName; }

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

        public String getBoardingHouseName() { return boardingHouseName; }
        public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }

        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}
