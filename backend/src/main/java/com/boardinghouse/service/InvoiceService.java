package com.boardinghouse.service;

import com.boardinghouse.dto.*;
import com.boardinghouse.entity.*;
import com.boardinghouse.entity.RoomService;
import com.boardinghouse.exception.BadRequestException;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InvoiceService {
    private final InvoiceRepository repository;
    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final ServiceTypeRepository serviceTypeRepository;

    public InvoiceService(InvoiceRepository repository, ContractRepository contractRepository,
                         PaymentRepository paymentRepository, RoomServiceRepository roomServiceRepository,
                         ServiceTypeRepository serviceTypeRepository) {
        this.repository = repository;
        this.contractRepository = contractRepository;
        this.paymentRepository = paymentRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.serviceTypeRepository = serviceTypeRepository;
    }

    public List<InvoiceDto> getAll() { return repository.findAll().stream().map(this::toDto).collect(Collectors.toList()); }
    public InvoiceDto getById(Long id) { return toDto(repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id))); }
    public InvoiceDetailDto getDetailById(Long id) { return toDetailDto(repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id))); }
    public List<InvoiceDto> getByContract(Long contractId) { return repository.findByContractId(contractId).stream().map(this::toDto).collect(Collectors.toList()); }

    private BigDecimal addRentItem(Invoice invoice, Contract contract) {
        InvoiceItem ri = new InvoiceItem();
        ri.setInvoice(invoice);
        ri.setType(InvoiceItemType.RENT);
        BigDecimal rate = contract.getDailyRate() != null ? contract.getDailyRate() : BigDecimal.ZERO;
        long days = Math.max(1, ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate()));
        BigDecimal amt = rate.multiply(BigDecimal.valueOf(days));
        ri.setDescription("Room Rent (" + days + " days x " + rate + "/day)");
        ri.setQuantity(BigDecimal.valueOf(days));
        ri.setUnitPrice(rate);
        ri.setAmount(amt);
        invoice.getItems().add(ri);
        return amt;
    }

    @Transactional
    public InvoiceDto generateInvoice(Long contractId, Integer month, Integer year) {
        Contract contract = contractRepository.findById(contractId).orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        if (contract.getStatus() != ContractStatus.ACTIVE) throw new BadRequestException("Cannot generate invoice for non-active contract");
        if (!repository.findByContractIdAndPeriodMonthAndPeriodYear(contractId, month, year).isEmpty()) throw new BadRequestException("Invoice already exists for this period");
        Invoice inv = new Invoice();
        inv.setCode(generateInvoiceCode(contract.getCode(), month, year));
        inv.setContract(contract); inv.setRoom(contract.getRoom());
        inv.setPeriodMonth(month); inv.setPeriodYear(year);
        inv.setDueDate(LocalDate.of(year, month, 1).plusMonths(1).minusDays(1));
        inv.setStatus(PaymentStatus.UNPAID);
        BigDecimal total = addRentItem(inv, contract);
        for (RoomService rs : roomServiceRepository.findByRoomId(contract.getRoom().getId())) {
            InvoiceItem si = new InvoiceItem(); si.setInvoice(inv); si.setDescription(rs.getServiceType().getName()); si.setType(InvoiceItemType.SERVICE);
            if (rs.getServiceType().getCategory() == ServiceCategory.FIXED) {
                BigDecimal p = rs.getFixedPrice() != null ? rs.getFixedPrice() : rs.getServiceType().getPricePerUnit();
                si.setQuantity(BigDecimal.ONE); si.setUnitPrice(p); si.setAmount(p); total = total.add(p);
            } else { si.setQuantity(BigDecimal.ZERO); si.setUnitPrice(rs.getPricePerUnit() != null ? rs.getPricePerUnit() : rs.getServiceType().getPricePerUnit()); si.setAmount(BigDecimal.ZERO); }
            inv.getItems().add(si);
        }
        inv.setTotalAmount(total);
        return toDto(repository.save(inv));
    }

    @Transactional
    public InvoiceDto generateInvoiceWithReadings(GenerateInvoiceWithReadingsRequest req) {
        Contract contract = contractRepository.findById(req.getContractId()).orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        if (contract.getStatus() != ContractStatus.ACTIVE) throw new BadRequestException("Cannot generate invoice for non-active contract");
        if (!repository.findByContractIdAndPeriodMonthAndPeriodYear(req.getContractId(), req.getMonth(), req.getYear()).isEmpty()) throw new BadRequestException("Invoice already exists for this period");
        Invoice inv = new Invoice();
        inv.setCode(generateInvoiceCode(contract.getCode(), req.getMonth(), req.getYear()));
        inv.setContract(contract); inv.setRoom(contract.getRoom());
        inv.setPeriodMonth(req.getMonth()); inv.setPeriodYear(req.getYear());
        inv.setDueDate(LocalDate.of(req.getYear(), req.getMonth(), 1).plusMonths(1).minusDays(1));
        inv.setStatus(PaymentStatus.UNPAID);
        BigDecimal total = addRentItem(inv, contract);
        java.util.Map<Long, UtilityReadingDto> rm = req.getReadings().stream().collect(Collectors.toMap(UtilityReadingDto::getServiceTypeId, r -> r));
        for (RoomService rs : roomServiceRepository.findByRoomId(contract.getRoom().getId())) {
            InvoiceItem si = new InvoiceItem(); si.setInvoice(inv); si.setDescription(rs.getServiceType().getName()); si.setType(InvoiceItemType.SERVICE);
            if (rs.getServiceType().getCategory() == ServiceCategory.FIXED) {
                BigDecimal p = rs.getFixedPrice() != null ? rs.getFixedPrice() : rs.getServiceType().getPricePerUnit();
                si.setQuantity(BigDecimal.ONE); si.setUnitPrice(p); si.setAmount(p); total = total.add(p);
            } else {
                UtilityReadingDto rd = rm.get(rs.getServiceType().getId());
                if (rd != null && rd.getOldIndex() != null && rd.getNewIndex() != null) {
                    BigDecimal c = rd.getNewIndex().subtract(rd.getOldIndex());
                    if (c.compareTo(BigDecimal.ZERO) < 0) throw new BadRequestException("New index must be >= old index for " + rs.getServiceType().getName());
                    BigDecimal up = rs.getPricePerUnit() != null ? rs.getPricePerUnit() : rs.getServiceType().getPricePerUnit();
                    si.setOldIndex(rd.getOldIndex()); si.setNewIndex(rd.getNewIndex()); si.setQuantity(c); si.setUnitPrice(up); si.setAmount(c.multiply(up)); total = total.add(c.multiply(up));
                } else throw new BadRequestException("Reading required for " + rs.getServiceType().getName());
            }
            inv.getItems().add(si);
        }
        inv.setTotalAmount(total);
        return toDto(repository.save(inv));
    }

    public InvoiceDto previewInvoiceWithReadings(GenerateInvoiceWithReadingsRequest req) {
        Contract contract = contractRepository.findById(req.getContractId()).orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        if (contract.getStatus() != ContractStatus.ACTIVE) throw new BadRequestException("Cannot preview invoice for non-active contract");
        if (!repository.findByContractIdAndPeriodMonthAndPeriodYear(req.getContractId(), req.getMonth(), req.getYear()).isEmpty()) throw new BadRequestException("Invoice already exists for this period");
        Invoice inv = new Invoice();
        inv.setCode(generateInvoiceCode(contract.getCode(), req.getMonth(), req.getYear()));
        inv.setContract(contract); inv.setRoom(contract.getRoom());
        inv.setPeriodMonth(req.getMonth()); inv.setPeriodYear(req.getYear());
        inv.setDueDate(LocalDate.of(req.getYear(), req.getMonth(), 1).plusMonths(1).minusDays(1));
        inv.setStatus(PaymentStatus.UNPAID);
        BigDecimal total = addRentItem(inv, contract);
        java.util.Map<Long, UtilityReadingDto> rm = req.getReadings().stream().collect(Collectors.toMap(UtilityReadingDto::getServiceTypeId, r -> r));
        for (RoomService rs : roomServiceRepository.findByRoomId(contract.getRoom().getId())) {
            InvoiceItem si = new InvoiceItem(); si.setInvoice(inv); si.setDescription(rs.getServiceType().getName()); si.setType(InvoiceItemType.SERVICE);
            if (rs.getServiceType().getCategory() == ServiceCategory.FIXED) {
                BigDecimal p = rs.getFixedPrice() != null ? rs.getFixedPrice() : rs.getServiceType().getPricePerUnit();
                si.setQuantity(BigDecimal.ONE); si.setUnitPrice(p); si.setAmount(p); total = total.add(p);
            } else {
                UtilityReadingDto rd = rm.get(rs.getServiceType().getId());
                if (rd != null && rd.getOldIndex() != null && rd.getNewIndex() != null) {
                    BigDecimal c = rd.getNewIndex().subtract(rd.getOldIndex());
                    if (c.compareTo(BigDecimal.ZERO) < 0) throw new BadRequestException("New index must be >= old index for " + rs.getServiceType().getName());
                    BigDecimal up = rs.getPricePerUnit() != null ? rs.getPricePerUnit() : rs.getServiceType().getPricePerUnit();
                    si.setOldIndex(rd.getOldIndex()); si.setNewIndex(rd.getNewIndex()); si.setQuantity(c); si.setUnitPrice(up); si.setAmount(c.multiply(up)); total = total.add(c.multiply(up));
                } else throw new BadRequestException("Reading required for " + rs.getServiceType().getName());
            }
            inv.getItems().add(si);
        }
        inv.setTotalAmount(total);
        return toDto(inv);
    }

    @Transactional
    public void updateInvoiceStatus(Long invoiceId) {
        Invoice inv = repository.findById(invoiceId).orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (inv.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) { inv.setStatus(PaymentStatus.UNPAID); repository.save(inv); return; }
        BigDecimal paid = paymentRepository.findByInvoiceId(invoiceId).stream().map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paid.compareTo(BigDecimal.ZERO) == 0) inv.setStatus(PaymentStatus.UNPAID);
        else if (paid.compareTo(inv.getTotalAmount()) >= 0) inv.setStatus(PaymentStatus.PAID);
        else inv.setStatus(PaymentStatus.PARTIALLY_PAID);
        if (inv.getStatus() != PaymentStatus.PAID && LocalDate.now().isAfter(inv.getDueDate())) inv.setStatus(PaymentStatus.OVERDUE);
        repository.save(inv);
    }

    private String generateInvoiceCode(String cc, Integer m, Integer y) { return String.format("INV-%s-%02d-%d", cc, m, y); }

    @Transactional
    public void delete(Long id) {
        Invoice inv = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
        java.util.List<Payment> payments = paymentRepository.findByInvoiceId(id);
        if (!payments.isEmpty()) throw new BadRequestException("Cannot delete invoice with " + payments.size() + " payment(s). Delete payments first.");
        repository.delete(inv);
    }

    public int bulkDelete(java.util.List<Long> ids) { int d = 0; for (Long id : ids) { try { delete(id); d++; } catch (Exception e) {} } return d; }

    private InvoiceDto toDto(Invoice inv) {
        InvoiceDto d = new InvoiceDto();
        d.setId(inv.getId()); d.setCode(inv.getCode());
        d.setContractId(inv.getContract().getId()); d.setContractCode(inv.getContract().getCode());
        d.setRoomId(inv.getRoom().getId()); d.setRoomCode(inv.getRoom().getCode());
        d.setBoardingHouseId(inv.getRoom().getBoardingHouse().getId());
        d.setBoardingHouseName(inv.getRoom().getBoardingHouse().getName());
        d.setTenantName(inv.getContract().getMainTenant().getFullName());
        d.setPeriodMonth(inv.getPeriodMonth()); d.setPeriodYear(inv.getPeriodYear());
        d.setTotalAmount(inv.getTotalAmount()); d.setStatus(inv.getStatus());
        d.setDueDate(inv.getDueDate()); d.setCreatedDate(inv.getCreatedDate());
        BigDecimal pa = paymentRepository.findByInvoiceId(inv.getId()).stream().map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        d.setPaidAmount(pa); d.setRemainingAmount(inv.getTotalAmount().subtract(pa));
        d.setItems(inv.getItems().stream().map(this::itemToDto).collect(Collectors.toList()));
        return d;
    }

    private InvoiceItemDto itemToDto(InvoiceItem i) {
        InvoiceItemDto d = new InvoiceItemDto();
        d.setId(i.getId()); d.setDescription(i.getDescription()); d.setType(i.getType());
        d.setQuantity(i.getQuantity()); d.setUnitPrice(i.getUnitPrice()); d.setAmount(i.getAmount());
        d.setOldIndex(i.getOldIndex()); d.setNewIndex(i.getNewIndex());
        return d;
    }

    private InvoiceDetailDto toDetailDto(Invoice inv) {
        InvoiceDetailDto d = new InvoiceDetailDto();
        d.setId(inv.getId()); d.setCode(inv.getCode());
        d.setContractId(inv.getContract().getId()); d.setContractCode(inv.getContract().getCode());
        d.setRoomId(inv.getRoom().getId()); d.setRoomCode(inv.getRoom().getCode());
        d.setBoardingHouseName(inv.getRoom().getBoardingHouse().getName());
        d.setPeriodMonth(inv.getPeriodMonth()); d.setPeriodYear(inv.getPeriodYear());
        d.setTotalAmount(inv.getTotalAmount()); d.setStatus(inv.getStatus());
        d.setDueDate(inv.getDueDate()); d.setCreatedDate(inv.getCreatedDate());
        BigDecimal pa = paymentRepository.findByInvoiceId(inv.getId()).stream().map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        d.setPaidAmount(pa); d.setRemainingAmount(inv.getTotalAmount().subtract(pa));
        d.setItems(inv.getItems().stream().map(this::itemToDto).collect(Collectors.toList()));
        d.setPayments(paymentRepository.findByInvoiceId(inv.getId()).stream().map(p -> {
            PaymentDto pd = new PaymentDto(); pd.setId(p.getId()); pd.setInvoiceId(p.getInvoice().getId());
            pd.setInvoiceCode(p.getInvoice().getCode()); pd.setPaidAmount(p.getPaidAmount());
            pd.setPaymentDate(p.getPaymentDate()); pd.setMethod(p.getMethod());
            pd.setNote(p.getNote()); pd.setTransactionCode(p.getTransactionCode()); return pd;
        }).collect(Collectors.toList()));
        d.setMainTenantName(inv.getContract().getMainTenant().getFullName());
        d.setMainTenantPhone(inv.getContract().getMainTenant().getPhone());
        return d;
    }
}
