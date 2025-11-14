package com.boardinghouse.service;

import com.boardinghouse.dto.*;
import com.boardinghouse.entity.*;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DetailService {
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final RoomRepository roomRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final TenantRepository tenantRepository;

    public DetailService(ContractRepository contractRepository, InvoiceRepository invoiceRepository,
                        PaymentRepository paymentRepository, RoomRepository roomRepository,
                        RoomServiceRepository roomServiceRepository, TenantRepository tenantRepository) {
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.roomRepository = roomRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.tenantRepository = tenantRepository;
    }

    public ContractDetailDto getContractDetail(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id: " + id));

        ContractDetailDto dto = new ContractDetailDto();
        dto.setId(contract.getId());
        dto.setCode(contract.getCode());
        dto.setRoomId(contract.getRoom().getId());
        dto.setRoomCode(contract.getRoom().getCode());
        dto.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
        dto.setMainTenantId(contract.getMainTenant().getId());
        dto.setMainTenantName(contract.getMainTenant().getFullName());
        dto.setMainTenantPhone(contract.getMainTenant().getPhone());
        dto.setMainTenantEmail(contract.getMainTenant().getEmail());
        dto.setTenants(contract.getTenants().stream().map(this::tenantToDto).collect(Collectors.toList()));
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());
        dto.setDeposit(contract.getDeposit());
        dto.setMonthlyRent(contract.getMonthlyRent());
        dto.setStatus(contract.getStatus());
        dto.setBillingCycle(contract.getBillingCycle());
        dto.setTerminationReason(contract.getTerminationReason());
        dto.setTerminationDate(contract.getTerminationDate());

        // Get invoices
        List<Invoice> invoices = invoiceRepository.findByContractId(id);
        dto.setInvoices(invoices.stream().map(this::invoiceToDto).collect(Collectors.toList()));

        // Calculate days remaining
        if (contract.getStatus() == ContractStatus.ACTIVE && contract.getEndDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), contract.getEndDate());
            dto.setDaysRemaining(days > 0 ? days : 0);
        }

        return dto;
    }

    public RoomDetailDto getRoomDetail(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));

        RoomDetailDto dto = new RoomDetailDto();
        dto.setId(room.getId());
        dto.setCode(room.getCode());
        dto.setBoardingHouseId(room.getBoardingHouse().getId());
        dto.setBoardingHouseName(room.getBoardingHouse().getName());
        dto.setBoardingHouseAddress(room.getBoardingHouse().getAddress());
        dto.setFloor(room.getFloor());
        dto.setArea(room.getArea());
        dto.setMaxOccupants(room.getMaxOccupants());
        dto.setBaseRent(room.getBaseRent());
        dto.setStatus(room.getStatus());

        // Get services
        List<com.boardinghouse.entity.RoomService> roomServices = roomServiceRepository.findByRoomId(id);
        dto.setServices(roomServices.stream().map(rs -> {
            RoomServiceDto rsDto = new RoomServiceDto();
            rsDto.setId(rs.getId());
            rsDto.setRoomId(rs.getRoom().getId());
            rsDto.setRoomCode(rs.getRoom().getCode());
            rsDto.setServiceTypeId(rs.getServiceType().getId());
            rsDto.setServiceTypeName(rs.getServiceType().getName());
            rsDto.setServiceCategory(rs.getServiceType().getCategory());
            rsDto.setPricePerUnit(rs.getPricePerUnit());
            rsDto.setFixedPrice(rs.getFixedPrice());
            return rsDto;
        }).collect(Collectors.toList()));

        // Get current contract
        List<Contract> contracts = contractRepository.findByRoomId(id);
        Contract activeContract = contracts.stream()
                .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
                .findFirst()
                .orElse(null);
        if (activeContract != null) {
            ContractDto contractDto = new ContractDto();
            contractDto.setId(activeContract.getId());
            contractDto.setCode(activeContract.getCode());
            contractDto.setRoomId(activeContract.getRoom().getId());
            contractDto.setRoomCode(activeContract.getRoom().getCode());
            contractDto.setMainTenantId(activeContract.getMainTenant().getId());
            contractDto.setMainTenantName(activeContract.getMainTenant().getFullName());
            contractDto.setStartDate(activeContract.getStartDate());
            contractDto.setEndDate(activeContract.getEndDate());
            contractDto.setMonthlyRent(activeContract.getMonthlyRent());
            contractDto.setStatus(activeContract.getStatus());
            dto.setCurrentContract(contractDto);
        }

        // Get recent invoices (last 5)
        List<Invoice> invoices = invoiceRepository.findByRoomId(id).stream()
                .sorted((a, b) -> b.getCreatedDate().compareTo(a.getCreatedDate()))
                .limit(5)
                .collect(Collectors.toList());
        dto.setRecentInvoices(invoices.stream().map(this::invoiceToDto).collect(Collectors.toList()));

        return dto;
    }

    public TenantDetailDto getTenantDetail(Long id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));

        TenantDetailDto dto = new TenantDetailDto();
        dto.setId(tenant.getId());
        dto.setUserId(tenant.getUser() != null ? tenant.getUser().getId() : null);
        dto.setFullName(tenant.getFullName());
        dto.setPhone(tenant.getPhone());
        dto.setEmail(tenant.getEmail());
        dto.setIdentityNumber(tenant.getIdentityNumber());
        dto.setDateOfBirth(tenant.getDateOfBirth());
        dto.setPermanentAddress(tenant.getPermanentAddress());
        dto.setStatus(tenant.getStatus());

        // Get contracts
        List<Contract> contracts = contractRepository.findAll().stream()
                .filter(c -> c.getTenants().stream().anyMatch(t -> t.getId().equals(id)) ||
                            c.getMainTenant().getId().equals(id))
                .collect(Collectors.toList());
        dto.setContracts(contracts.stream().map(c -> {
            ContractDto contractDto = new ContractDto();
            contractDto.setId(c.getId());
            contractDto.setCode(c.getCode());
            contractDto.setRoomId(c.getRoom().getId());
            contractDto.setRoomCode(c.getRoom().getCode());
            contractDto.setMainTenantId(c.getMainTenant().getId());
            contractDto.setMainTenantName(c.getMainTenant().getFullName());
            contractDto.setStartDate(c.getStartDate());
            contractDto.setEndDate(c.getEndDate());
            contractDto.setMonthlyRent(c.getMonthlyRent());
            contractDto.setStatus(c.getStatus());
            return contractDto;
        }).collect(Collectors.toList()));

        // Get invoices from contracts
        List<Invoice> allInvoices = invoiceRepository.findAll().stream()
                .filter(inv -> contracts.stream().anyMatch(c -> c.getId().equals(inv.getContract().getId())))
                .collect(Collectors.toList());
        dto.setInvoices(allInvoices.stream().map(this::invoiceToDto).collect(Collectors.toList()));
        dto.setTotalInvoices((long) allInvoices.size());
        dto.setUnpaidInvoices(allInvoices.stream()
                .filter(inv -> inv.getStatus() != PaymentStatus.PAID)
                .count());

        return dto;
    }

    private TenantDto tenantToDto(Tenant tenant) {
        TenantDto dto = new TenantDto();
        dto.setId(tenant.getId());
        dto.setFullName(tenant.getFullName());
        dto.setPhone(tenant.getPhone());
        dto.setEmail(tenant.getEmail());
        dto.setIdentityNumber(tenant.getIdentityNumber());
        dto.setDateOfBirth(tenant.getDateOfBirth());
        dto.setPermanentAddress(tenant.getPermanentAddress());
        dto.setStatus(tenant.getStatus());
        return dto;
    }

    private InvoiceDto invoiceToDto(Invoice invoice) {
        InvoiceDto dto = new InvoiceDto();
        dto.setId(invoice.getId());
        dto.setCode(invoice.getCode());
        dto.setContractId(invoice.getContract().getId());
        dto.setContractCode(invoice.getContract().getCode());
        dto.setRoomId(invoice.getRoom().getId());
        dto.setRoomCode(invoice.getRoom().getCode());
        dto.setPeriodMonth(invoice.getPeriodMonth());
        dto.setPeriodYear(invoice.getPeriodYear());
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setStatus(invoice.getStatus());
        dto.setDueDate(invoice.getDueDate());
        dto.setCreatedDate(invoice.getCreatedDate());

        BigDecimal paidAmount = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setPaidAmount(paidAmount);
        dto.setRemainingAmount(invoice.getTotalAmount().subtract(paidAmount));
        return dto;
    }
}

