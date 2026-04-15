package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class GuestChargesSummaryDto {
    private Long contractId;
    private String contractCode;
    private String roomCode;
    private String tenantName;

    // Contract info for display
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BigDecimal dailyRate;
    private BigDecimal deposit;

    private BigDecimal totalCharges;       // tổng tiền dịch vụ
    private BigDecimal totalRent;          // tiền phòng = dailyRate × số đêm
    private BigDecimal totalAmount;        // tổng cộng
    private BigDecimal totalPaid;          // đã thanh toán
    private BigDecimal remainingAmount;    // còn lại

    private List<GuestServiceChargeDto> charges;
    private Map<String, BigDecimal> chargesByDate;
}
