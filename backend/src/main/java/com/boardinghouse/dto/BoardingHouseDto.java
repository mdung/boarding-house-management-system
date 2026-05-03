package com.boardinghouse.dto;

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getNumberOfFloors() { return numberOfFloors; }
    public void setNumberOfFloors(Integer numberOfFloors) { this.numberOfFloors = numberOfFloors; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getTotalRooms() { return totalRooms; }
    public void setTotalRooms(Long totalRooms) { this.totalRooms = totalRooms; }

    public Long getOccupiedRooms() { return occupiedRooms; }
    public void setOccupiedRooms(Long occupiedRooms) { this.occupiedRooms = occupiedRooms; }

    public Long getAvailableRooms() { return availableRooms; }
    public void setAvailableRooms(Long availableRooms) { this.availableRooms = availableRooms; }
}
