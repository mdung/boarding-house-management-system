package com.boardinghouse.service;

import com.boardinghouse.dto.RoomDto;
import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.entity.Room;
import com.boardinghouse.entity.RoomStatus;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.BoardingHouseRepository;
import com.boardinghouse.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomService {
    private final RoomRepository repository;
    private final BoardingHouseRepository boardingHouseRepository;

    public RoomService(RoomRepository repository, BoardingHouseRepository boardingHouseRepository) {
        this.repository = repository;
        this.boardingHouseRepository = boardingHouseRepository;
    }

    public List<RoomDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<RoomDto> getByBoardingHouse(Long boardingHouseId) {
        return repository.findByBoardingHouseId(boardingHouseId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public RoomDto getById(Long id) {
        Room room = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
        return toDto(room);
    }

    @Transactional
    public RoomDto create(RoomDto dto) {
        if (repository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Room code already exists: " + dto.getCode());
        }

        BoardingHouse house = boardingHouseRepository.findById(dto.getBoardingHouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found"));

        Room room = new Room();
        room.setCode(dto.getCode());
        room.setBoardingHouse(house);
        room.setFloor(dto.getFloor());
        room.setArea(dto.getArea());
        room.setMaxOccupants(dto.getMaxOccupants());
        room.setBaseRent(dto.getBaseRent());
        room.setStatus(dto.getStatus() != null ? dto.getStatus() : RoomStatus.AVAILABLE);
        return toDto(repository.save(room));
    }

    @Transactional
    public RoomDto update(Long id, RoomDto dto) {
        Room room = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));

        if (!room.getCode().equals(dto.getCode()) && repository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Room code already exists: " + dto.getCode());
        }

        if (dto.getBoardingHouseId() != null && !dto.getBoardingHouseId().equals(room.getBoardingHouse().getId())) {
            BoardingHouse house = boardingHouseRepository.findById(dto.getBoardingHouseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found"));
            room.setBoardingHouse(house);
        }

        room.setCode(dto.getCode());
        room.setFloor(dto.getFloor());
        room.setArea(dto.getArea());
        room.setMaxOccupants(dto.getMaxOccupants());
        room.setBaseRent(dto.getBaseRent());
        if (dto.getStatus() != null) {
            room.setStatus(dto.getStatus());
        }
        return toDto(repository.save(room));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Room not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private RoomDto toDto(Room room) {
        RoomDto dto = new RoomDto();
        dto.setId(room.getId());
        dto.setCode(room.getCode());
        dto.setBoardingHouseId(room.getBoardingHouse().getId());
        dto.setBoardingHouseName(room.getBoardingHouse().getName());
        dto.setFloor(room.getFloor());
        dto.setArea(room.getArea());
        dto.setMaxOccupants(room.getMaxOccupants());
        dto.setBaseRent(room.getBaseRent());
        dto.setStatus(room.getStatus());
        return dto;
    }
}

