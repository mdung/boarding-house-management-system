package com.boardinghouse.service;

import com.boardinghouse.dto.PaymentDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {
    private final PaymentRepository repository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final ContractRepository contractRepository;
    private final GuestServiceChargeRepository guestChargeRepository;

    public PaymentService(PaymentRepository repository, InvoiceRepository invoiceRepository,
                         InvoiceService invoiceService, ContractRepository contractRepository,
                         GuestServiceChargeRepository guestChargeRepository) {
        this.repository = repository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
        this.contractRepository = contractRepository;
        this.guestChargeRepository = guestChargeRepository;
    }

    public List<PaymentDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<PaymentDto> getByInvoice(Long invoiceId) {
        return repository.findByInvoiceId(invoiceId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public PaymentDto getById(Long id) {
        Payment payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        return toDto(payment);
    }

    /** Standard invoice-based payment */
    @Transactional
    public PaymentDto create(PaymentDto dto) {
        Invoice invoice = invoiceRepository.findById(dto.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        BigDecimal totalPaid = repository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalPaid.add(dto.getPaidAmount()).compareTo(invoice.getTotalAmount()) > 0) {
            throw new BadRequestException("Payment amount exceeds invoice total");
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setPaidAmount(dto.getPaidAmount());
        payment.setPaymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDateTime.now());
        payment.setMethod(dto.getMethod());
        payment.setNote(dto.getNote());
        payment.setTransactionCode(dto.getTransactionCode());

        Payment saved = repository.save(payment);
        invoiceService.updateInvoiceStatus(invoice.getId());
        return toDto(saved);
    }

    /**
     * Contract-based payment: auto-creates a summary invoice if none exists,
     * then records the payment against it.
     */
    @Transactional
    public PaymentDto createForContract(Long contractId, PaymentDto dto) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        // Calculate total bill: dailyRate × nights + guest charges
        long nights = ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate());
        BigDecimal dailyRate = contract.getDailyRate() != null ? contract.getDailyRate()
                : (contract.getMonthlyRent() != null
                    ? contract.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
        BigDecimal roomCost = dailyRate.multiply(BigDecimal.valueOf(nights));
        BigDecimal charges = guestChargeRepository.sumAmountByContractId(contractId);
        BigDecimal totalBill = roomCost.add(charges);

        // Total already paid across all invoices of this contract
        BigDecimal alreadyPaid = invoiceRepository.findByContractId(contractId).stream()
                .flatMap(inv -> repository.findByInvoiceId(inv.getId()).stream())
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remaining = totalBill.subtract(alreadyPaid);

        if (dto.getPaidAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than 0");
        }
        if (dto.getPaidAmount().compareTo(remaining) > 0) {
            throw new BadRequestException("Payment amount exceeds remaining balance of "
                    + remaining.toPlainString());
        }

        // Find or create a summary invoice for this contract
        Invoice invoice = invoiceRepository.findByContractId(contractId).stream()
                .filter(inv -> "SUMMARY".equals(inv.getCode()) || inv.getCode().startsWith("SUM-"))
                .findFirst()
                .orElseGet(() -> {
                    Invoice inv = new Invoice();
                    inv.setCode("SUM-" + contract.getCode());
                    inv.setContract(contract);
                    inv.setRoom(contract.getRoom());
                    inv.setPeriodMonth(contract.getStartDate().getMonthValue());
                    inv.setPeriodYear(contract.getStartDate().getYear());
                    inv.setTotalAmount(totalBill);
                    inv.setStatus(PaymentStatus.UNPAID);
                    inv.setDueDate(contract.getEndDate());
                    return invoiceRepository.save(inv);
                });

        // Update invoice total in case charges changed
        invoice.setTotalAmount(totalBill);
        invoiceRepository.save(invoice);

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setPaidAmount(dto.getPaidAmount());
        payment.setPaymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDateTime.now());
        payment.setMethod(dto.getMethod() != null ? dto.getMethod() : PaymentMethod.CASH);
        payment.setNote(dto.getNote());
        payment.setTransactionCode(dto.getTransactionCode());

        Payment saved = repository.save(payment);
        invoiceService.updateInvoiceStatus(invoice.getId());
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Payment payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        Long invoiceId = payment.getInvoice().getId();
        repository.deleteById(id);
        invoiceService.updateInvoiceStatus(invoiceId);
    }

    private PaymentDto toDto(Payment payment) {
        PaymentDto dto = new PaymentDto();
        dto.setId(payment.getId());
        dto.setInvoiceId(payment.getInvoice().getId());
        dto.setInvoiceCode(payment.getInvoice().getCode());
        dto.setPaidAmount(payment.getPaidAmount());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setMethod(payment.getMethod());
        dto.setNote(payment.getNote());
        dto.setTransactionCode(payment.getTransactionCode());
        // include contract info
        dto.setContractId(payment.getInvoice().getContract().getId());
        dto.setTenantName(payment.getInvoice().getContract().getMainTenant().getFullName());
        dto.setRoomCode(payment.getInvoice().getRoom().getCode());
        return dto;
    }
}

