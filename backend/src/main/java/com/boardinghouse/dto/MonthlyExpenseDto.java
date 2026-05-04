package com.boardinghouse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class MonthlyExpenseDto {
    private Long id;
    private Long boardingHouseId;
    private String boardingHouseName;
    private Integer month;
    private Integer year;
    private String category;
    private String description;
    private BigDecimal amount;
    private String note;
    private LocalDate createdDate;

    public MonthlyExpenseDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }
    public String getBoardingHouseName() { return boardingHouseName; }
    public void setBoardingHouseName(String boardingHouseName) { this.boardingHouseName = boardingHouseName; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public LocalDate getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDate createdDate) { this.createdDate = createdDate; }
}
