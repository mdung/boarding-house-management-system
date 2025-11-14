package com.boardinghouse.service;

import com.boardinghouse.dto.PaymentDto;
import com.boardinghouse.entity.Invoice;
import com.boardinghouse.entity.Payment;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {
    private final PaymentRepository repository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

    public PaymentService(PaymentRepository repository, InvoiceRepository invoiceRepository,
                         InvoiceService invoiceService) {
        this.repository = repository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
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

    @Transactional
    public PaymentDto create(PaymentDto dto) {
        Invoice invoice = invoiceRepository.findById(dto.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        BigDecimal totalPaid = repository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getPaidAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

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
        return dto;
    }
}

