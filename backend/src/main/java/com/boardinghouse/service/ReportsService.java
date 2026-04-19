package com.boardinghouse.service;

import com.boardinghouse.dto.OutstandingDebtDto;
import com.boardinghouse.dto.RevenueByBoardingHouseDto;
import com.boardinghouse.dto.RevenueByMonthDto;
import com.boardinghouse.dto.ServiceRevenueDto;
import com.boardinghouse.dto.TenantDto;
import com.boardinghouse.entity.ContractStatus;
import com.boardinghouse.entity.Invoice;
import com.boardinghouse.entity.PaymentStatus;
import com.boardinghouse.entity.TenantStatus;
import com.boardinghouse.repository.ContractRepository;
import com.boardinghouse.repository.GuestServiceChargeRepository;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import com.boardinghouse.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final GuestServiceChargeRepository guestChargeRepository;

    public ReportsService(InvoiceRepository invoiceRepository, PaymentRepository paymentRepository,
                         ContractRepository contractRepository, TenantRepository tenantRepository,
                         GuestServiceChargeRepository guestChargeRepository) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.contractRepository = contractRepository;
        this.tenantRepository = tenantRepository;
        this.guestChargeRepository = guestChargeRepository;
    }

    public List<RevenueByMonthDto> getRevenueByMonth(Integer year) {
            // ── Cash collected: payments actually received in each month ──────────
            List<com.boardinghouse.entity.Payment> allPayments = paymentRepository.findAll();
            Map<Integer, BigDecimal> collectedByMonth = allPayments.stream()
                    .filter(p -> p.getPaymentDate().getYear() == year)
                    .collect(Collectors.groupingBy(
                            p -> p.getPaymentDate().getMonthValue(),
                            Collectors.reducing(BigDecimal.ZERO, com.boardinghouse.entity.Payment::getPaidAmount, BigDecimal::add)));

            // ── Earned revenue: room cost + service charges for contracts active each month ──
            // Earned revenue: use invoice.totalAmount by periodMonth (accrual basis)
            // This aligns with how invoices are actually billed, regardless of contract dates
            Map<Integer, BigDecimal> earnedRoomByMonth = new java.util.TreeMap<>();
            Map<Integer, BigDecimal> earnedServiceByMonth = new java.util.TreeMap<>();

            invoiceRepository.findAll().stream()
                    .filter(inv -> inv.getPeriodYear().equals(year))
                    .filter(inv -> inv.getContract().getStatus() != com.boardinghouse.entity.ContractStatus.DRAFT)
                    .forEach(inv -> earnedRoomByMonth.merge(inv.getPeriodMonth(), inv.getTotalAmount(), BigDecimal::add));

            List<com.boardinghouse.entity.Contract> allContracts = contractRepository.findAll();
            for (com.boardinghouse.entity.Contract c : allContracts) {
                if (c.getStatus() == com.boardinghouse.entity.ContractStatus.DRAFT) continue;
                guestChargeRepository.findByContractIdOrderByChargeDateDesc(c.getId()).stream()
                        .filter(gc -> gc.getChargeDate().getYear() == year)
                        .forEach(gc -> earnedServiceByMonth.merge(
                                gc.getChargeDate().getMonthValue(), gc.getAmount(), BigDecimal::add));
            }

            // ── Invoice counts ────────────────────────────────────────────────────
            Map<Integer, Long> invoiceCountByMonth = invoiceRepository.findAll().stream()
                    .filter(inv -> inv.getPeriodYear().equals(year))
                    .collect(Collectors.groupingBy(Invoice::getPeriodMonth, Collectors.counting()));
            Map<Integer, Long> paidInvoiceCountByMonth = invoiceRepository.findAll().stream()
                    .filter(inv -> inv.getPeriodYear().equals(year))
                    .filter(inv -> {
                        BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                                .map(com.boardinghouse.entity.Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                        return paid.compareTo(inv.getTotalAmount()) >= 0;
                    })
                    .collect(Collectors.groupingBy(Invoice::getPeriodMonth, Collectors.counting()));

            // ── Merge all months ──────────────────────────────────────────────────
            java.util.Set<Integer> months = new java.util.TreeSet<>();
            months.addAll(collectedByMonth.keySet());
            months.addAll(earnedRoomByMonth.keySet());
            months.addAll(earnedServiceByMonth.keySet());
            months.addAll(invoiceCountByMonth.keySet());

            return months.stream().map(month -> {
                BigDecimal collected = collectedByMonth.getOrDefault(month, BigDecimal.ZERO);
                BigDecimal earnedRoom = earnedRoomByMonth.getOrDefault(month, BigDecimal.ZERO);
                BigDecimal earnedSvc = earnedServiceByMonth.getOrDefault(month, BigDecimal.ZERO);
                BigDecimal earned = earnedRoom.add(earnedSvc);
                BigDecimal uncollected = earned.subtract(collected).max(BigDecimal.ZERO);

                RevenueByMonthDto dto = new RevenueByMonthDto();
                dto.setMonth(month);
                dto.setYear(year);
                dto.setTotalRevenue(collected);
                dto.setEarnedRevenue(earned);
                dto.setEarnedRoomRevenue(earnedRoom);
                dto.setEarnedServiceRevenue(earnedSvc);
                dto.setUncollectedRevenue(uncollected);
                dto.setInvoiceCount(invoiceCountByMonth.getOrDefault(month, 0L));
                dto.setPaidInvoiceCount(paidInvoiceCountByMonth.getOrDefault(month, 0L));
                return dto;
            }).collect(Collectors.toList());
        }


    public List<RevenueByBoardingHouseDto> getRevenueByBoardingHouse(LocalDate startDate, LocalDate endDate) {
        // Group invoices by boarding house where invoice period overlaps the date range
        // Use invoice.totalAmount (earned/accrual basis) consistent with Revenue by Month
        List<Invoice> invoices = invoiceRepository.findAll().stream()
                .filter(inv -> {
                    // Invoice period: first day of periodMonth/Year to last day
                    LocalDate periodStart = LocalDate.of(inv.getPeriodYear(), inv.getPeriodMonth(), 1);
                    LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());
                    return !periodEnd.isBefore(startDate) && !periodStart.isAfter(endDate);
                })
                .filter(inv -> inv.getContract().getStatus() != com.boardinghouse.entity.ContractStatus.DRAFT)
                .collect(Collectors.toList());

        // Also include service charges in the date range
        Map<Long, BigDecimal> serviceByHouse = new java.util.HashMap<>();
        contractRepository.findAll().stream()
                .filter(c -> c.getStatus() != com.boardinghouse.entity.ContractStatus.DRAFT)
                .forEach(c -> {
                    Long houseId = c.getRoom().getBoardingHouse().getId();
                    guestChargeRepository.findByContractIdOrderByChargeDateDesc(c.getId()).stream()
                            .filter(gc -> !gc.getChargeDate().isBefore(startDate) && !gc.getChargeDate().isAfter(endDate))
                            .forEach(gc -> serviceByHouse.merge(houseId, gc.getAmount(), BigDecimal::add));
                });

        Map<Long, List<Invoice>> byHouse = invoices.stream()
                .collect(Collectors.groupingBy(inv -> inv.getRoom().getBoardingHouse().getId()));

        // Merge all house IDs
        java.util.Set<Long> allHouseIds = new java.util.HashSet<>();
        allHouseIds.addAll(byHouse.keySet());
        allHouseIds.addAll(serviceByHouse.keySet());

        return allHouseIds.stream().map(houseId -> {
            List<Invoice> houseInvoices = byHouse.getOrDefault(houseId, java.util.Collections.emptyList());
            BigDecimal roomRevenue = houseInvoices.stream()
                    .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal svcRevenue = serviceByHouse.getOrDefault(houseId, BigDecimal.ZERO);

            long invoiceCount = houseInvoices.size();
            long paidCount = houseInvoices.stream().filter(inv -> {
                BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                        .map(p -> p.getPaidAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
                return paid.compareTo(inv.getTotalAmount()) >= 0;
            }).count();

            String houseName = !houseInvoices.isEmpty()
                    ? houseInvoices.get(0).getRoom().getBoardingHouse().getName()
                    : contractRepository.findAll().stream()
                        .filter(c -> c.getRoom().getBoardingHouse().getId().equals(houseId))
                        .findFirst().map(c -> c.getRoom().getBoardingHouse().getName()).orElse("Unknown");

            RevenueByBoardingHouseDto dto = new RevenueByBoardingHouseDto();
            dto.setBoardingHouseId(houseId);
            dto.setBoardingHouseName(houseName);
            dto.setTotalRevenue(roomRevenue.add(svcRevenue));
            dto.setInvoiceCount(invoiceCount);
            dto.setPaidInvoiceCount(paidCount);
            return dto;
        }).sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
          .collect(Collectors.toList());
    }

    public List<TenantDto> getTenantsCurrentlyRenting() {
        return contractRepository.findByStatus(ContractStatus.ACTIVE).stream()
                .filter(c -> !Boolean.TRUE.equals(c.getRoomReleased()))
                .map(contract -> contract.getMainTenant())
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

    public List<ServiceRevenueDto> getServiceRevenue(LocalDate startDate, LocalDate endDate) {
        return guestChargeRepository.findByChargeDateBetween(startDate, endDate).stream()
                .collect(Collectors.groupingBy(
                        c -> c.getDescription().trim(),
                        Collectors.toList()
                ))
                .entrySet().stream()
                .map(entry -> {
                    ServiceRevenueDto dto = new ServiceRevenueDto();
                    dto.setDescription(entry.getKey());
                    dto.setTotalAmount(entry.getValue().stream()
                            .map(c -> c.getAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
                    dto.setCount((long) entry.getValue().size());
                    return dto;
                })
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
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

