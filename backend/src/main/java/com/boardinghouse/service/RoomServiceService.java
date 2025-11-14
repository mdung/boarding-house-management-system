package com.boardinghouse.service;

import com.boardinghouse.dto.RoomServiceDto;
import com.boardinghouse.entity.Room;
import com.boardinghouse.entity.RoomService;
import com.boardinghouse.entity.ServiceType;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.RoomRepository;
import com.boardinghouse.repository.RoomServiceRepository;
import com.boardinghouse.repository.ServiceTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoomServiceService {
    private final RoomServiceRepository repository;
    private final RoomRepository roomRepository;
    private final ServiceTypeRepository serviceTypeRepository;

    public RoomServiceService(RoomServiceRepository repository, RoomRepository roomRepository,
                             ServiceTypeRepository serviceTypeRepository) {
        this.repository = repository;
        this.roomRepository = roomRepository;
        this.serviceTypeRepository = serviceTypeRepository;
    }

    public List<RoomServiceDto> getByRoom(Long roomId) {
        return repository.findByRoomId(roomId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public RoomServiceDto getById(Long id) {
        RoomService roomService = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room service not found with id: " + id));
        return toDto(roomService);
    }

    @Transactional
    public RoomServiceDto create(Long roomId, RoomServiceDto dto) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        ServiceType serviceType = serviceTypeRepository.findById(dto.getServiceTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Service type not found"));

        // Check if service already assigned to room
        boolean alreadyExists = repository.findByRoomId(roomId).stream()
                .anyMatch(rs -> rs.getServiceType().getId().equals(dto.getServiceTypeId()));
        if (alreadyExists) {
            throw new BadRequestException("Service already assigned to this room");
        }

        RoomService roomService = new RoomService();
        roomService.setRoom(room);
        roomService.setServiceType(serviceType);
        roomService.setPricePerUnit(dto.getPricePerUnit());
        roomService.setFixedPrice(dto.getFixedPrice());
        return toDto(repository.save(roomService));
    }

    @Transactional
    public RoomServiceDto update(Long id, RoomServiceDto dto) {
        RoomService roomService = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room service not found with id: " + id));

        if (dto.getPricePerUnit() != null) {
            roomService.setPricePerUnit(dto.getPricePerUnit());
        }
        if (dto.getFixedPrice() != null) {
            roomService.setFixedPrice(dto.getFixedPrice());
        }
        return toDto(repository.save(roomService));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Room service not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private RoomServiceDto toDto(RoomService roomService) {
        RoomServiceDto dto = new RoomServiceDto();
        dto.setId(roomService.getId());
        dto.setRoomId(roomService.getRoom().getId());
        dto.setRoomCode(roomService.getRoom().getCode());
        dto.setServiceTypeId(roomService.getServiceType().getId());
        dto.setServiceTypeName(roomService.getServiceType().getName());
        dto.setServiceCategory(roomService.getServiceType().getCategory());
        dto.setPricePerUnit(roomService.getPricePerUnit());
        dto.setFixedPrice(roomService.getFixedPrice());
        return dto;
    }
}

