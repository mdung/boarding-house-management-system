package com.boardinghouse.service;

import com.boardinghouse.dto.InvoiceDto;
import com.boardinghouse.dto.InvoiceItemDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.ContractRepository;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import com.boardinghouse.repository.RoomServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;
    private final RoomServiceRepository roomServiceRepository;

    public InvoiceService(InvoiceRepository repository, ContractRepository contractRepository,
                         PaymentRepository paymentRepository, RoomServiceRepository roomServiceRepository) {
        this.repository = repository;
        this.contractRepository = contractRepository;
        this.paymentRepository = paymentRepository;
        this.roomServiceRepository = roomServiceRepository;
    }

    public List<InvoiceDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public InvoiceDto getById(Long id) {
        Invoice invoice = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
        return toDto(invoice);
    }

    public List<InvoiceDto> getByContract(Long contractId) {
        return repository.findByContractId(contractId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public InvoiceDto generateInvoice(Long contractId, Integer month, Integer year) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Cannot generate invoice for non-active contract");
        }

        // Check if invoice already exists
        List<Invoice> existing = repository.findByContractIdAndPeriodMonthAndPeriodYear(contractId, month, year);
        if (!existing.isEmpty()) {
            throw new BadRequestException("Invoice already exists for this period");
        }

        Invoice invoice = new Invoice();
        invoice.setCode(generateInvoiceCode(contract.getCode(), month, year));
        invoice.setContract(contract);
        invoice.setRoom(contract.getRoom());
        invoice.setPeriodMonth(month);
        invoice.setPeriodYear(year);
        invoice.setDueDate(LocalDate.of(year, month, 1).plusMonths(1).minusDays(1));
        invoice.setStatus(PaymentStatus.UNPAID);

        BigDecimal totalAmount = BigDecimal.ZERO;

        // Add rent item
        InvoiceItem rentItem = new InvoiceItem();
        rentItem.setInvoice(invoice);
        rentItem.setDescription("Monthly Rent");
        rentItem.setType(InvoiceItemType.RENT);
        rentItem.setQuantity(BigDecimal.ONE);
        rentItem.setUnitPrice(contract.getMonthlyRent());
        rentItem.setAmount(contract.getMonthlyRent());
        invoice.getItems().add(rentItem);
        totalAmount = totalAmount.add(contract.getMonthlyRent());

        // Add service items (simplified - in real app, you'd get actual readings)
        List<RoomService> roomServices = roomServiceRepository.findByRoomId(contract.getRoom().getId());
        for (RoomService roomService : roomServices) {
            InvoiceItem serviceItem = new InvoiceItem();
            serviceItem.setInvoice(invoice);
            serviceItem.setDescription(roomService.getServiceType().getName());
            serviceItem.setType(InvoiceItemType.SERVICE);

            if (roomService.getServiceType().getCategory() == ServiceCategory.FIXED) {
                BigDecimal price = roomService.getFixedPrice() != null ?
                        roomService.getFixedPrice() : roomService.getServiceType().getPricePerUnit();
                serviceItem.setQuantity(BigDecimal.ONE);
                serviceItem.setUnitPrice(price);
                serviceItem.setAmount(price);
                totalAmount = totalAmount.add(price);
            } else {
                // For electricity/water, you'd need actual readings
                // This is simplified - in production, you'd pass readings as parameters
                serviceItem.setQuantity(BigDecimal.ZERO);
                serviceItem.setUnitPrice(roomService.getPricePerUnit() != null ?
                        roomService.getPricePerUnit() : roomService.getServiceType().getPricePerUnit());
                serviceItem.setAmount(BigDecimal.ZERO);
            }
            invoice.getItems().add(serviceItem);
        }

        invoice.setTotalAmount(totalAmount);
        return toDto(repository.save(invoice));
    }

    @Transactional
    public void updateInvoiceStatus(Long invoiceId) {
        Invoice invoice = repository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPaid.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(PaymentStatus.UNPAID);
        } else if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(PaymentStatus.PAID);
        } else {
            invoice.setStatus(PaymentStatus.PARTIALLY_PAID);
        }

        // Check if overdue
        if (invoice.getStatus() != PaymentStatus.PAID && LocalDate.now().isAfter(invoice.getDueDate())) {
            invoice.setStatus(PaymentStatus.OVERDUE);
        }

        repository.save(invoice);
    }

    private String generateInvoiceCode(String contractCode, Integer month, Integer year) {
        return String.format("INV-%s-%02d-%d", contractCode, month, year);
    }

    private InvoiceDto toDto(Invoice invoice) {
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

        dto.setItems(invoice.getItems().stream().map(this::itemToDto).collect(Collectors.toList()));
        return dto;
    }

    private InvoiceItemDto itemToDto(InvoiceItem item) {
        InvoiceItemDto dto = new InvoiceItemDto();
        dto.setId(item.getId());
        dto.setDescription(item.getDescription());
        dto.setType(item.getType());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setAmount(item.getAmount());
        dto.setOldIndex(item.getOldIndex());
        dto.setNewIndex(item.getNewIndex());
        return dto;
    }
}

