package com.boardinghouse.service;

import com.boardinghouse.dto.OutstandingDebtDto;
import com.boardinghouse.dto.RevenueByBoardingHouseDto;
import com.boardinghouse.dto.RevenueByMonthDto;
import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.entity.ContractStatus;
import com.boardinghouse.entity.Invoice;
import com.boardinghouse.entity.PaymentStatus;
import com.boardinghouse.entity.TenantStatus;
import com.boardinghouse.repository.ContractRepository;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import com.boardinghouse.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportsService {
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final ContractRepository contractRepository;
    private final TenantRepository tenantRepository;

    public ReportsService(InvoiceRepository invoiceRepository, PaymentRepository paymentRepository,
                         ContractRepository contractRepository, TenantRepository tenantRepository) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.contractRepository = contractRepository;
        this.tenantRepository = tenantRepository;
    }

    public List<RevenueByMonthDto> getRevenueByMonth(Integer year) {
        List<Invoice> invoices = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getPeriodYear().equals(year))
                .collect(Collectors.toList());

        Map<Integer, List<Invoice>> byMonth = invoices.stream()
                .collect(Collectors.groupingBy(Invoice::getPeriodMonth));

        return byMonth.entrySet().stream()
                .map(entry -> {
                    Integer month = entry.getKey();
                    List<Invoice> monthInvoices = entry.getValue();

                    BigDecimal totalRevenue = monthInvoices.stream()
                            .filter(inv -> inv.getStatus() == PaymentStatus.PAID)
                            .map(inv -> {
                                BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                                        .map(p -> p.getPaidAmount())
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                                return paid;
                            })
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    long paidCount = monthInvoices.stream()
                            .filter(inv -> inv.getStatus() == PaymentStatus.PAID)
                            .count();

                    RevenueByMonthDto dto = new RevenueByMonthDto();
                    dto.setMonth(month);
                    dto.setYear(year);
                    dto.setTotalRevenue(totalRevenue);
                    dto.setInvoiceCount((long) monthInvoices.size());
                    dto.setPaidInvoiceCount(paidCount);
                    return dto;
                })
                .sorted((a, b) -> a.getMonth().compareTo(b.getMonth()))
                .collect(Collectors.toList());
    }

    public List<RevenueByBoardingHouseDto> getRevenueByBoardingHouse(LocalDate startDate, LocalDate endDate) {
        List<Invoice> invoices = invoiceRepository.findAll().stream()
                .filter(inv -> {
                    LocalDate invoiceDate = LocalDate.of(inv.getPeriodYear(), inv.getPeriodMonth(), 1);
                    return !invoiceDate.isBefore(startDate) && !invoiceDate.isAfter(endDate);
                })
                .collect(Collectors.toList());

        Map<Long, List<Invoice>> byBoardingHouse = invoices.stream()
                .collect(Collectors.groupingBy(inv -> inv.getRoom().getBoardingHouse().getId()));

        return byBoardingHouse.entrySet().stream()
                .map(entry -> {
                    Long boardingHouseId = entry.getKey();
                    List<Invoice> houseInvoices = entry.getValue();

                    BigDecimal totalRevenue = houseInvoices.stream()
                            .filter(inv -> inv.getStatus() == PaymentStatus.PAID)
                            .map(inv -> {
                                BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                                        .map(p -> p.getPaidAmount())
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                                return paid;
                            })
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    long paidCount = houseInvoices.stream()
                            .filter(inv -> inv.getStatus() == PaymentStatus.PAID)
                            .count();

                    RevenueByBoardingHouseDto dto = new RevenueByBoardingHouseDto();
                    dto.setBoardingHouseId(boardingHouseId);
                    dto.setBoardingHouseName(houseInvoices.get(0).getRoom().getBoardingHouse().getName());
                    dto.setTotalRevenue(totalRevenue);
                    dto.setInvoiceCount((long) houseInvoices.size());
                    dto.setPaidInvoiceCount(paidCount);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<TenantDto> getTenantsCurrentlyRenting() {
        return contractRepository.findByStatus(ContractStatus.ACTIVE).stream()
                .flatMap(contract -> contract.getTenants().stream())
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .distinct()
                .map(tenant -> {
                    TenantDto dto = new TenantDto();
                    dto.setId(tenant.getId());
                    dto.setUserId(tenant.getUser() != null ? tenant.getUser().getId() : null);
                    dto.setFullName(tenant.getFullName());
                    dto.setPhone(tenant.getPhone());
                    dto.setEmail(tenant.getEmail());
                    dto.setIdentityNumber(tenant.getIdentityNumber());
                    dto.setDateOfBirth(tenant.getDateOfBirth());
                    dto.setPermanentAddress(tenant.getPermanentAddress());
                    dto.setStatus(tenant.getStatus());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<OutstandingDebtDto> getOutstandingDebts() {
        List<Invoice> unpaidInvoices = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getStatus() != PaymentStatus.PAID)
                .collect(Collectors.toList());

        return unpaidInvoices.stream()
                .map(invoice -> {
                    BigDecimal paidAmount = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                            .map(p -> p.getPaidAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal remainingAmount = invoice.getTotalAmount().subtract(paidAmount);

                    long daysOverdue = 0;
                    if (invoice.getDueDate().isBefore(LocalDate.now())) {
                        daysOverdue = ChronoUnit.DAYS.between(invoice.getDueDate(), LocalDate.now());
                    }

                    OutstandingDebtDto dto = new OutstandingDebtDto();
                    dto.setInvoiceId(invoice.getId());
                    dto.setInvoiceCode(invoice.getCode());
                    dto.setContractId(invoice.getContract().getId());
                    dto.setContractCode(invoice.getContract().getCode());
                    dto.setRoomId(invoice.getRoom().getId());
                    dto.setRoomCode(invoice.getRoom().getCode());
                    dto.setTenantName(invoice.getContract().getMainTenant().getFullName());
                    dto.setTotalAmount(invoice.getTotalAmount());
                    dto.setPaidAmount(paidAmount);
                    dto.setRemainingAmount(remainingAmount);
                    dto.setStatus(invoice.getStatus());
                    dto.setDueDate(invoice.getDueDate());
                    dto.setDaysOverdue((int) daysOverdue);
                    return dto;
                })
                .sorted((a, b) -> b.getDaysOverdue().compareTo(a.getDaysOverdue()))
                .collect(Collectors.toList());
    }
}

