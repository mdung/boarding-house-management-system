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
        // Group ALL payments by the month they were actually received (paymentDate)
        List<com.boardinghouse.entity.Payment> allPayments = paymentRepository.findAll();

        Map<Integer, List<com.boardinghouse.entity.Payment>> byMonth = allPayments.stream()
                .filter(p -> p.getPaymentDate().getYear() == year)
                .collect(Collectors.groupingBy(p -> p.getPaymentDate().getMonthValue()));

        // Also get invoice counts per period month for context
        Map<Integer, Long> invoiceCountByMonth = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getPeriodYear().equals(year))
                .collect(Collectors.groupingBy(Invoice::getPeriodMonth, Collectors.counting()));

        Map<Integer, Long> paidInvoiceCountByMonth = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getPeriodYear().equals(year))
                .filter(inv -> {
                    BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                            .map(p -> p.getPaidAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return paid.compareTo(inv.getTotalAmount()) >= 0;
                })
                .collect(Collectors.groupingBy(Invoice::getPeriodMonth, Collectors.counting()));

        // Merge: for each month that has payments OR invoices
        java.util.Set<Integer> months = new java.util.TreeSet<>();
        months.addAll(byMonth.keySet());
        months.addAll(invoiceCountByMonth.keySet());

        return months.stream()
                .map(month -> {
                    BigDecimal totalRevenue = byMonth.getOrDefault(month, java.util.Collections.emptyList()).stream()
                            .map(com.boardinghouse.entity.Payment::getPaidAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    RevenueByMonthDto dto = new RevenueByMonthDto();
                    dto.setMonth(month);
                    dto.setYear(year);
                    dto.setTotalRevenue(totalRevenue);
                    dto.setInvoiceCount(invoiceCountByMonth.getOrDefault(month, 0L));
                    dto.setPaidInvoiceCount(paidInvoiceCountByMonth.getOrDefault(month, 0L));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<RevenueByBoardingHouseDto> getRevenueByBoardingHouse(LocalDate startDate, LocalDate endDate) {
        // Group payments by boarding house, filtered by payment date range
        List<com.boardinghouse.entity.Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> {
                    LocalDate pd = p.getPaymentDate().toLocalDate();
                    return !pd.isBefore(startDate) && !pd.isAfter(endDate);
                })
                .collect(Collectors.toList());

        Map<Long, List<com.boardinghouse.entity.Payment>> byHouse = payments.stream()
                .collect(Collectors.groupingBy(p -> p.getInvoice().getRoom().getBoardingHouse().getId()));

        return byHouse.entrySet().stream()
                .map(entry -> {
                    Long boardingHouseId = entry.getKey();
                    List<com.boardinghouse.entity.Payment> housePayments = entry.getValue();

                    BigDecimal totalRevenue = housePayments.stream()
                            .map(com.boardinghouse.entity.Payment::getPaidAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    // Count unique invoices that have payments
                    long invoiceCount = housePayments.stream()
                            .map(p -> p.getInvoice().getId()).distinct().count();
                    long paidCount = housePayments.stream()
                            .map(p -> p.getInvoice()).distinct()
                            .filter(inv -> {
                                BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                                        .map(pp -> pp.getPaidAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
                                return paid.compareTo(inv.getTotalAmount()) >= 0;
                            }).count();

                    RevenueByBoardingHouseDto dto = new RevenueByBoardingHouseDto();
                    dto.setBoardingHouseId(boardingHouseId);
                    dto.setBoardingHouseName(housePayments.get(0).getInvoice().getRoom().getBoardingHouse().getName());
                    dto.setTotalRevenue(totalRevenue);
                    dto.setInvoiceCount(invoiceCount);
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
        return invoiceRepository.findAll().stream()
                .map(invoice -> {
                    BigDecimal paidAmount = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                            .map(p -> p.getPaidAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal remainingAmount = invoice.getTotalAmount().subtract(paidAmount);
                    return new Object[]{ invoice, paidAmount, remainingAmount };
                })
                .filter(arr -> ((BigDecimal) arr[2]).compareTo(BigDecimal.ZERO) > 0)
                .map(arr -> {
                    Invoice invoice = (Invoice) arr[0];
                    BigDecimal paidAmount = (BigDecimal) arr[1];
                    BigDecimal remainingAmount = (BigDecimal) arr[2];

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

