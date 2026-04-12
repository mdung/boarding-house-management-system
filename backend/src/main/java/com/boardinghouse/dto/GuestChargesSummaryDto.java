package com.boardinghouse.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class GuestChargesSummaryDto {
    private Long contractId;
    private String contractCode;
    private String roomCode;
    private String tenantName;

    private BigDecimal totalCharges;       // tổng tiền dịch vụ
    private BigDecimal totalRent;          // tổng tiền thuê phòng (từ invoices)
    private BigDecimal totalAmount;        // tổng cộng
    private BigDecimal totalPaid;          // đã thanh toán
    private BigDecimal remainingAmount;    // còn lại

    private List<GuestServiceChargeDto> charges;
    private Map<String, BigDecimal> chargesByDate; // tổng theo ngày
}
