package com.boardinghouse.dto;

import java.time.LocalDateTime;

public class RoomPhotoDto {
    private Long id;
    private Long roomId;
    private String roomCode;
    private Long boardingHouseId;
    private String filePath;
    private String url;           // full URL served by backend
    private String originalName;
    private String caption;
    private Integer sortOrder;
    private Boolean isPrimary;
    private LocalDateTime uploadedAt;

    public RoomPhotoDto() {}

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }
    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
    public Long getBoardingHouseId() { return boardingHouseId; }
    public void setBoardingHouseId(Long boardingHouseId) { this.boardingHouseId = boardingHouseId; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
