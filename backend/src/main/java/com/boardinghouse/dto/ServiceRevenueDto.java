package com.boardinghouse.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class ServiceRevenueDto {
    private String description;
    private BigDecimal totalAmount;
    private Long count;

    @Data
    public static class DetailItem {
        private LocalDate chargeDate;
        private String tenantName;
        private String roomCode;
        private String boardingHouseName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
        private String note;
    }

    private List<DetailItem> items;
}
