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

    public List<ContractDto> getAll() {
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
        } else if (saved.getStatus() == ContractStatus.TERMINATED || saved.getStatus() == ContractStatus.EXPIRED) {
            room.setStatus(RoomStatus.AVAILABLE);
        }
        roomRepository.save(room);

        return toDto(saved);
    }

    @Transactional
    public ContractDto terminate(Long id, String reason, java.time.LocalDate terminationDate) {
        Contract contract = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminationReason(reason);
        contract.setTerminationDate(terminationDate);

        Room room = contract.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);

        return toDto(repository.save(contract));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Contract not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private ContractDto toDto(Contract contract) {
        ContractDto dto = new ContractDto();
        dto.setId(contract.getId());
        dto.setCode(contract.getCode());
        dto.setRoomId(contract.getRoom().getId());
        dto.setRoomCode(contract.getRoom().getCode());
        dto.setMainTenantId(contract.getMainTenant().getId());
        dto.setMainTenantName(contract.getMainTenant().getFullName());
        dto.setTenantIds(contract.getTenants().stream().map(Tenant::getId).collect(Collectors.toList()));
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());
        dto.setDeposit(contract.getDeposit());
        dto.setMonthlyRent(contract.getMonthlyRent());
        dto.setStatus(contract.getStatus());
        dto.setBillingCycle(contract.getBillingCycle());
        dto.setTerminationReason(contract.getTerminationReason());
        dto.setTerminationDate(contract.getTerminationDate());
        return dto;
    }
}

