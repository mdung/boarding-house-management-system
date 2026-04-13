package com.boardinghouse.dto;

import lombok.Data;

@Data
public class BoardingHouseDto {
    private Long id;
    private String name;
    private String address;
    private String description;
    private Integer numberOfFloors;
    private String notes;
    private Long totalRooms;
    private Long occupiedRooms;
    private Long availableRooms;
}

