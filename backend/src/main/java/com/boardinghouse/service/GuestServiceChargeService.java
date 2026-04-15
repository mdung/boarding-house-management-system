package com.boardinghouse.service;

import com.boardinghouse.dto.GuestChargesSummaryDto;
import com.boardinghouse.dto.GuestServiceChargeDto;
import com.boardinghouse.entity.Contract;
import com.boardinghouse.entity.GuestServiceCharge;
import com.boardinghouse.entity.Payment;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.ContractRepository;
import com.boardinghouse.repository.GuestServiceChargeRepository;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GuestServiceChargeService {

    private final GuestServiceChargeRepository repository;
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public GuestServiceChargeService(GuestServiceChargeRepository repository,
                                     ContractRepository contractRepository,
                                     InvoiceRepository invoiceRepository,
                                     PaymentRepository paymentRepository) {
        this.repository = repository;
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    public List<GuestServiceChargeDto> getByContract(Long contractId) {
        return repository.findByContractIdOrderByChargeDateDesc(contractId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public GuestServiceChargeDto create(GuestServiceChargeDto dto) {
        Contract contract = contractRepository.findById(dto.getContractId())
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        GuestServiceCharge charge = new GuestServiceCharge();
        charge.setContract(contract);
        charge.setRoom(contract.getRoom());
        charge.setChargeDate(dto.getChargeDate());
        charge.setDescription(dto.getDescription());
        charge.setQuantity(dto.getQuantity());
        charge.setUnitPrice(dto.getUnitPrice());
        charge.setAmount(dto.getQuantity().multiply(dto.getUnitPrice()));
        charge.setNote(dto.getNote());

        return toDto(repository.save(charge));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Charge not found with id: " + id);
        }
        repository.deleteById(id);
    }

    public GuestChargesSummaryDto getSummary(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));

        List<GuestServiceCharge> charges = repository.findByContractIdOrderByChargeDateDesc(contractId);

        BigDecimal totalCharges = charges.stream()
                .map(GuestServiceCharge::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tính tiền phòng từ dailyRate × số đêm (không phụ thuộc invoices)
        long nights = java.time.temporal.ChronoUnit.DAYS.between(
                contract.getStartDate(), contract.getEndDate());
        BigDecimal dailyRate = contract.getDailyRate() != null ? contract.getDailyRate()
                : (contract.getMonthlyRent() != null
                    ? contract.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
        BigDecimal totalRent = dailyRate.multiply(BigDecimal.valueOf(nights));

        BigDecimal totalAmount = totalCharges.add(totalRent);

        // Tổng đã thanh toán từ payments của invoices
        BigDecimal totalPaid = invoiceRepository.findByContractId(contractId).stream()
                .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remaining = totalAmount.subtract(totalPaid);

        // Group charges by date
        Map<String, BigDecimal> byDate = charges.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getChargeDate().toString(),
                        LinkedHashMap::new,
                        Collectors.reducing(BigDecimal.ZERO, GuestServiceCharge::getAmount, BigDecimal::add)
                ));

        GuestChargesSummaryDto summary = new GuestChargesSummaryDto();
        summary.setContractId(contractId);
        summary.setContractCode(contract.getCode());
        summary.setRoomCode(contract.getRoom().getCode());
        summary.setTenantName(contract.getMainTenant().getFullName());
        summary.setCheckInDate(contract.getStartDate());
        summary.setCheckOutDate(contract.getEndDate());
        summary.setTotalNights((int) nights);
        summary.setDailyRate(dailyRate);
        summary.setDeposit(contract.getDeposit());
        summary.setTotalCharges(totalCharges);
        summary.setTotalRent(totalRent);
        summary.setTotalAmount(totalAmount);
        summary.setTotalPaid(totalPaid);
        summary.setRemainingAmount(remaining);
        summary.setCharges(charges.stream().map(this::toDto).collect(Collectors.toList()));
        summary.setChargesByDate(byDate);

        return summary;
    }

    private GuestServiceChargeDto toDto(GuestServiceCharge c) {
        GuestServiceChargeDto dto = new GuestServiceChargeDto();
        dto.setId(c.getId());
        dto.setContractId(c.getContract().getId());
        dto.setContractCode(c.getContract().getCode());
        dto.setRoomId(c.getRoom().getId());
        dto.setRoomCode(c.getRoom().getCode());
        dto.setChargeDate(c.getChargeDate());
        dto.setDescription(c.getDescription());
        dto.setQuantity(c.getQuantity());
        dto.setUnitPrice(c.getUnitPrice());
        dto.setAmount(c.getAmount());
        dto.setNote(c.getNote());
        dto.setCreatedDate(c.getCreatedDate());
        return dto;
    }
}
