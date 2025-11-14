package com.boardinghouse.service;

import com.boardinghouse.dto.BoardingHouseDto;
import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.BoardingHouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BoardingHouseService {
    private final BoardingHouseRepository repository;

    public BoardingHouseService(BoardingHouseRepository repository) {
        this.repository = repository;
    }

    public List<BoardingHouseDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public BoardingHouseDto getById(Long id) {
        BoardingHouse house = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found with id: " + id));
        return toDto(house);
    }

    @Transactional
    public BoardingHouseDto create(BoardingHouseDto dto) {
        BoardingHouse house = new BoardingHouse();
        house.setName(dto.getName());
        house.setAddress(dto.getAddress());
        house.setDescription(dto.getDescription());
        house.setNumberOfFloors(dto.getNumberOfFloors());
        house.setNotes(dto.getNotes());
        return toDto(repository.save(house));
    }

    @Transactional
    public BoardingHouseDto update(Long id, BoardingHouseDto dto) {
        BoardingHouse house = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found with id: " + id));
        house.setName(dto.getName());
        house.setAddress(dto.getAddress());
        house.setDescription(dto.getDescription());
        house.setNumberOfFloors(dto.getNumberOfFloors());
        house.setNotes(dto.getNotes());
        return toDto(repository.save(house));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Boarding house not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private BoardingHouseDto toDto(BoardingHouse house) {
        BoardingHouseDto dto = new BoardingHouseDto();
        dto.setId(house.getId());
        dto.setName(house.getName());
        dto.setAddress(house.getAddress());
        dto.setDescription(house.getDescription());
        dto.setNumberOfFloors(house.getNumberOfFloors());
        dto.setNotes(house.getNotes());
        return dto;
    }
}

