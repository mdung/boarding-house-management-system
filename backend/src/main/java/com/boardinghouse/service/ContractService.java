package com.boardinghouse.service;

import com.boardinghouse.dto.ContractDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.ContractRepository;
import com.boardinghouse.repository.RoomRepository;
import com.boardinghouse.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ContractService {
    private final ContractRepository repository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;

    public ContractService(ContractRepository repository, RoomRepository roomRepository,
                          TenantRepository tenantRepository) {
        this.repository = repository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
    }

    @Transactional
    public void autoExpireContracts() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalTime now = java.time.LocalTime.now();
        java.time.LocalTime noon = java.time.LocalTime.of(12, 0);

        List<Contract> activeContracts = repository.findByStatus(ContractStatus.ACTIVE);

        // Backfill legacy null roomReleased: run once per contract until all are set
        activeContracts.stream()
                .filter(c -> c.getRoomReleased() == null)
                .forEach(c -> {
                    Room room = c.getRoom();
                    if (room.getStatus() == RoomStatus.AVAILABLE) {
                        c.setRoomReleased(true);
                    } else {
                        boolean isCurrentOccupant = repository.findByRoomId(room.getId()).stream()
                                .filter(o -> o.getStatus() == ContractStatus.ACTIVE)
                                .max(java.util.Comparator.comparing(Contract::getStartDate))
                                .map(latest -> latest.getId().equals(c.getId()))
                                .orElse(false);
                        c.setRoomReleased(!isCurrentOccupant);
                    }
                    repository.save(c);
                });

        for (Contract c : activeContracts) {
            if (c.getEndDate().isBefore(today)) {
                c.setStatus(ContractStatus.EXPIRED);
                c.setRoomReleased(true);
                repository.save(c);
                freeRoomIfNoOtherActive(c);
            } else if (c.getEndDate().equals(today) && now.isAfter(noon)) {
                c.setStatus(ContractStatus.EXPIRED);
                c.setRoomReleased(true);
                repository.save(c);
                freeRoomIfNoOtherActive(c);
            }
        }
    }

    private void freeRoomIfNoOtherActive(Contract c) {
        Room room = c.getRoom();
        if (room.getStatus() == RoomStatus.AVAILABLE) return; // already free
        boolean otherActive = repository.findByRoomId(room.getId()).stream()
                .anyMatch(other -> other.getStatus() == ContractStatus.ACTIVE
                        && !other.getId().equals(c.getId())
                        && !other.getEndDate().isBefore(java.time.LocalDate.now()));
        if (!otherActive) {
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }
    }

    /**
     * Manual early checkout - releases the room immediately.
     * Contract stays ACTIVE so guest still shows on Dashboard/Calendar.
     * Only the room status changes to AVAILABLE.
     */
    @Transactional
    public ContractDto manualCheckout(Long id) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        if (contract.getStatus() != ContractStatus.ACTIVE && contract.getStatus() != ContractStatus.EXPIRED) {
            throw new BadRequestException("Contract cannot be checked out");
        }

        // Set end date to today if checking out early
        java.time.LocalDate today = java.time.LocalDate.now();
        if (contract.getEndDate().isAfter(today)) {
            // Early checkout: set end to today, but ensure at least 1 night
            if (!today.isAfter(contract.getStartDate())) {
                contract.setEndDate(contract.getStartDate().plusDays(1));
            } else {
                contract.setEndDate(today);
            }
        }
        repository.save(contract);

        // Free the room so it can be assigned to new guests
        Room room = contract.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);

        // Mark this specific contract as room released
        contract.setRoomReleased(true);
        return toDto(repository.save(contract));
    }

    public List<ContractDto> getAll() {
        autoExpireContracts();
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ContractDto getById(Long id) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));
        return toDto(contract);
    }

    @Transactional
    public ContractDto create(ContractDto dto) {
        if (repository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Contract code already exists: " + dto.getCode());
        }

        Room room = roomRepository.findById(dto.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        Tenant mainTenant = tenantRepository.findById(dto.getMainTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Main tenant not found"));

        Contract contract = new Contract();
        contract.setCode(dto.getCode());
        contract.setRoom(room);
        contract.setMainTenant(mainTenant);
        contract.setStartDate(dto.getStartDate());
        contract.setEndDate(dto.getEndDate());
        contract.setDeposit(dto.getDeposit());
        contract.setMonthlyRent(dto.getMonthlyRent());
        contract.setDailyRate(dto.getDailyRate());
        contract.setStatus(dto.getStatus() != null ? dto.getStatus() : ContractStatus.DRAFT);
        contract.setBillingCycle(dto.getBillingCycle() != null ? dto.getBillingCycle() : BillingCycle.MONTHLY);

        if (dto.getTenantIds() != null && !dto.getTenantIds().isEmpty()) {
            List<Tenant> tenants = tenantRepository.findAllById(dto.getTenantIds());
            contract.setTenants(tenants);
        }

        Contract saved = repository.save(contract);

        // Update room status
        if (saved.getStatus() == ContractStatus.ACTIVE) {
            room.setStatus(RoomStatus.OCCUPIED);
            roomRepository.save(room);
        }

        return toDto(saved);
    }

    @Transactional
    public ContractDto update(Long id, ContractDto dto) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        if (!contract.getCode().equals(dto.getCode()) && repository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Contract code already exists: " + dto.getCode());
        }

        contract.setCode(dto.getCode());
        contract.setStartDate(dto.getStartDate());
        contract.setEndDate(dto.getEndDate());
        contract.setDeposit(dto.getDeposit());
        contract.setMonthlyRent(dto.getMonthlyRent());
        contract.setDailyRate(dto.getDailyRate());

        // Update room if changed
        if (dto.getRoomId() != null && !dto.getRoomId().equals(contract.getRoom().getId())) {
            Room oldRoom = contract.getRoom();
            Room newRoom = roomRepository.findById(dto.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
            // Free old room
            oldRoom.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(oldRoom);
            contract.setRoom(newRoom);
        }

        // Update main tenant if changed
        if (dto.getMainTenantId() != null && !dto.getMainTenantId().equals(contract.getMainTenant().getId())) {
            Tenant newTenant = tenantRepository.findById(dto.getMainTenantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tenant not found"));
            contract.setMainTenant(newTenant);
        }
        if (dto.getStatus() != null) {
            contract.setStatus(dto.getStatus());
        }
        if (dto.getBillingCycle() != null) {
            contract.setBillingCycle(dto.getBillingCycle());
        }

        if (dto.getTenantIds() != null) {
            List<Tenant> tenants = tenantRepository.findAllById(dto.getTenantIds());
            contract.setTenants(tenants);
        }

        Contract saved = repository.save(contract);

        // Update room status based on contract status
        Room room = saved.getRoom();
        if (saved.getStatus() == ContractStatus.ACTIVE) {
            room.setStatus(RoomStatus.OCCUPIED);
        } else if (saved.getStatus() == ContractStatus.TERMINATED
                || saved.getStatus() == ContractStatus.EXPIRED
                || saved.getStatus() == ContractStatus.DRAFT) {
            room.setStatus(RoomStatus.AVAILABLE);
        }
        roomRepository.save(room);

        return toDto(saved);
    }

    @Transactional
    public ContractDto updateCheckoutDate(Long id, java.time.LocalDate newEndDate) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));
        if (newEndDate.isBefore(contract.getStartDate())) {
            throw new com.boardinghouse.exception.BadRequestException("Checkout date cannot be before check-in date");
        }
        contract.setEndDate(newEndDate);

        // If new endDate is today or future → reactivate contract + set room occupied
        java.time.LocalDate today = java.time.LocalDate.now();
        if (!newEndDate.isBefore(today)) {
            if (contract.getStatus() == ContractStatus.EXPIRED) {
                contract.setStatus(ContractStatus.ACTIVE);
            }
            // Always re-occupy room if extending stay
            Room room = contract.getRoom();
            if (room.getStatus() == RoomStatus.AVAILABLE) {
                room.setStatus(RoomStatus.OCCUPIED);
                roomRepository.save(room);
            }
        }

        return toDto(repository.save(contract));
    }

    @Transactional
    public ContractDto terminate(Long id, String reason, java.time.LocalDate terminationDate) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminationReason(reason);
        contract.setTerminationDate(terminationDate);
        contract.setRoomReleased(true);

        Room room = contract.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);

        return toDto(repository.save(contract));
    }

    @Transactional
    public void delete(Long id) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        // Block if any invoice has payments
        boolean hasPayments = contract.getInvoices().stream()
                .anyMatch(inv -> !inv.getPayments().isEmpty());
        if (hasPayments) {
            throw new com.boardinghouse.exception.BadRequestException(
                "Cannot delete contract with paid invoices. Delete payments first.");
        }

        // Cascade will delete invoices + guest charges (CascadeType.ALL)
        Room room = contract.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
        repository.delete(contract);
    }

    private ContractDto toDto(Contract contract) {
        ContractDto dto = new ContractDto();
        dto.setId(contract.getId());
        dto.setCode(contract.getCode());
        dto.setRoomId(contract.getRoom().getId());
        dto.setRoomCode(contract.getRoom().getCode());
        dto.setBoardingHouseId(contract.getRoom().getBoardingHouse().getId());
        dto.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
        dto.setMainTenantId(contract.getMainTenant().getId());
        dto.setMainTenantName(contract.getMainTenant().getFullName());
        dto.setTenantIds(contract.getTenants().stream().map(Tenant::getId).collect(Collectors.toList()));
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());
        dto.setDeposit(contract.getDeposit());
        dto.setMonthlyRent(contract.getMonthlyRent());
        dto.setDailyRate(contract.getDailyRate());
        dto.setStatus(contract.getStatus());
        dto.setBillingCycle(contract.getBillingCycle());
        dto.setTerminationReason(contract.getTerminationReason());
        dto.setTerminationDate(contract.getTerminationDate());
        return dto;
    }
}

