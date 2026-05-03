package com.boardinghouse.service;

import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.entity.ContractStatus;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TenantService {
    private final TenantRepository repository;
    private final UserRepository userRepository;
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final GuestServiceChargeRepository guestChargeRepository;
    private final AuditLogService auditLogService;

    public TenantService(TenantRepository repository, UserRepository userRepository,
                         ContractRepository contractRepository, InvoiceRepository invoiceRepository,
                         PaymentRepository paymentRepository, GuestServiceChargeRepository guestChargeRepository,
                         AuditLogService auditLogService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.guestChargeRepository = guestChargeRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<TenantDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TenantDto getById(Long id) {
        Tenant tenant = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));
        return toDto(tenant);
    }

    public TenantDto getByUserId(Long userId) {
        Tenant tenant = repository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found for user id: " + userId));
        return toDto(tenant);
    }

    @Transactional
    public TenantDto create(TenantDto dto) {
        Tenant tenant = new Tenant();
        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            tenant.setUser(user);
        }
        tenant.setFullName(dto.getFullName());
        tenant.setPhone(dto.getPhone());
        tenant.setEmail(dto.getEmail());
        tenant.setIdentityNumber(dto.getIdentityNumber());
        tenant.setPassportNumber(dto.getPassportNumber());
        tenant.setDateOfBirth(dto.getDateOfBirth());
        tenant.setPermanentAddress(dto.getPermanentAddress());
        tenant.setStatus(dto.getStatus() != null ? dto.getStatus() : TenantStatus.ACTIVE);
        TenantDto result = toDto(repository.save(tenant));
        auditLogService.log("CREATE", "TENANT", "Created tenant: " + tenant.getFullName());
        return result;
    }

    @Transactional
    public TenantDto update(Long id, TenantDto dto) {
        Tenant tenant = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));

        if (dto.getUserId() != null && (tenant.getUser() == null || !tenant.getUser().getId().equals(dto.getUserId()))) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            tenant.setUser(user);
        }

        tenant.setFullName(dto.getFullName());
        tenant.setPhone(dto.getPhone());
        tenant.setEmail(dto.getEmail());
        tenant.setIdentityNumber(dto.getIdentityNumber());
        tenant.setPassportNumber(dto.getPassportNumber());
        tenant.setDateOfBirth(dto.getDateOfBirth());
        tenant.setPermanentAddress(dto.getPermanentAddress());
        if (dto.getStatus() != null) tenant.setStatus(dto.getStatus());
        TenantDto result = toDto(repository.save(tenant));
        auditLogService.log("UPDATE", "TENANT", "Updated tenant: " + tenant.getFullName());
        return result;
    }

    @Transactional
    public void delete(Long id) {
        Tenant tenant = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));

        // Block delete if tenant has ANY contracts (active or expired)
        List<Contract> contracts = contractRepository.findByMainTenantId(id);
        if (!contracts.isEmpty()) {
            throw new com.boardinghouse.exception.BadRequestException(
                "Cannot delete tenant with " + contracts.size() + " contract(s). Delete contracts first.");
        }

        // Remove tenant from all contract_tenants join table entries
        List<Contract> memberContracts = contractRepository.findAll().stream()
                .filter(c -> c.getTenants().stream().anyMatch(t -> t.getId().equals(id)))
                .collect(Collectors.toList());
        for (Contract c : memberContracts) {
            c.getTenants().removeIf(t -> t.getId().equals(id));
            contractRepository.save(c);
        }

        auditLogService.log("DELETE", "TENANT", "Deleted tenant: " + tenant.getFullName());
        repository.deleteById(id);
    }

    private TenantDto toDto(Tenant tenant) {
        TenantDto dto = new TenantDto();
        dto.setId(tenant.getId());
        dto.setUserId(tenant.getUser() != null ? tenant.getUser().getId() : null);
        dto.setFullName(tenant.getFullName());
        dto.setPhone(tenant.getPhone());
        dto.setEmail(tenant.getEmail());
        dto.setIdentityNumber(tenant.getIdentityNumber());
        dto.setPassportNumber(tenant.getPassportNumber());
        dto.setDateOfBirth(tenant.getDateOfBirth());
        dto.setPermanentAddress(tenant.getPermanentAddress());
        dto.setStatus(tenant.getStatus());

        try {
            // Find most recent contract: prefer ACTIVE, fallback to most recent any status
            List<Contract> allContracts = contractRepository.findByMainTenantId(tenant.getId());
            Optional<Contract> displayContract = allContracts.stream()
                    .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
                    .max(java.util.Comparator.comparing(Contract::getStartDate));
            if (displayContract.isEmpty()) {
                displayContract = allContracts.stream()
                        .max(java.util.Comparator.comparing(Contract::getEndDate));
            }
            displayContract.ifPresent(c -> {
                dto.setActiveContractId(c.getId());
                dto.setActiveRoomCode(c.getRoom().getCode());
                dto.setCheckInDate(c.getStartDate());
                dto.setCheckOutDate(c.getEndDate());
            });

            // Calculate debt from ALL contracts (not just active)
            BigDecimal totalDebt = BigDecimal.ZERO;
            BigDecimal totalCharges = BigDecimal.ZERO;
            for (Contract c : allContracts) {
                BigDecimal charges = guestChargeRepository.sumAmountByContractId(c.getId());
                totalCharges = totalCharges.add(charges);

            long nights = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
                BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
                BigDecimal roomCost = dailyRate.multiply(BigDecimal.valueOf(nights));

                BigDecimal paid = invoiceRepository.findByContractId(c.getId()).stream()
                        .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                        .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal debt = roomCost.add(charges).subtract(paid);
                if (debt.compareTo(BigDecimal.ZERO) > 0) {
                    totalDebt = totalDebt.add(debt);
                }
            }
            dto.setTotalCharges(totalCharges);
            dto.setTotalDebt(allContracts.isEmpty() ? null : totalDebt);
        } catch (Exception e) {
            System.err.println("Error loading contract info for tenant " + tenant.getId() + ": " + e.getMessage());
        }

        return dto;
    }
}

