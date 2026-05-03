package com.boardinghouse.dto;

import java.math.BigDecimal;

public class UtilityReadingDto {
    private Long serviceTypeId;
    private BigDecimal oldIndex;
    private BigDecimal newIndex;

    public UtilityReadingDto() {}

    public Long getServiceTypeId() { return serviceTypeId; }
    public void setServiceTypeId(Long serviceTypeId) { this.serviceTypeId = serviceTypeId; }

    public BigDecimal getOldIndex() { return oldIndex; }
    public void setOldIndex(BigDecimal oldIndex) { this.oldIndex = oldIndex; }

    public BigDecimal getNewIndex() { return newIndex; }
    public void setNewIndex(BigDecimal newIndex) { this.newIndex = newIndex; }
}
