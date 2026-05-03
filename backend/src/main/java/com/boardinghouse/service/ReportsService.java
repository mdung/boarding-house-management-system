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

            // ── Earned revenue: room cost from contracts + service charges ──
            // Room earned = dailyRate x days for contracts overlapping each month
            Map<Integer, BigDecimal> earnedRoomByMonth = new java.util.TreeMap<>();
            Map<Integer, BigDecimal> earnedServiceByMonth = new java.util.TreeMap<>();

            List<com.boardinghouse.entity.Contract> allContracts = contractRepository.findAll();
            for (com.boardinghouse.entity.Contract c : allContracts) {
                if (c.getStatus() == com.boardinghouse.entity.ContractStatus.DRAFT) continue;
                BigDecimal rate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
                if (rate.compareTo(BigDecimal.ZERO) == 0) continue;
                long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
                BigDecimal roomCost = rate.multiply(BigDecimal.valueOf(days));
                // Assign to the month the contract starts in (or overlaps)
                for (int m = 1; m <= 12; m++) {
                    LocalDate mStart = LocalDate.of(year, m, 1);
                    LocalDate mEnd = mStart.withDayOfMonth(mStart.lengthOfMonth());
                    if (c.getEndDate().isBefore(mStart) || c.getStartDate().isAfter(mEnd)) continue;
                    earnedRoomByMonth.merge(m, roomCost, BigDecimal::add);
                }
            }

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
        // Room revenue: dailyRate x days for contracts overlapping the date range, grouped by boarding house
        Map<Long, BigDecimal> roomByHouse = new java.util.HashMap<>();
        Map<Long, String> houseNames = new java.util.HashMap<>();

        for (com.boardinghouse.entity.Contract c : contractRepository.findAll()) {
            if (c.getStatus() == ContractStatus.DRAFT) continue;
            if (c.getEndDate().isBefore(startDate) || c.getStartDate().isAfter(endDate)) continue;
            BigDecimal rate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
            if (rate.compareTo(BigDecimal.ZERO) == 0) continue;
            long days = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal roomCost = rate.multiply(BigDecimal.valueOf(days));
            Long houseId = c.getRoom().getBoardingHouse().getId();
            roomByHouse.merge(houseId, roomCost, BigDecimal::add);
            houseNames.put(houseId, c.getRoom().getBoardingHouse().getName());
        }

        // Service charges in the date range
        Map<Long, BigDecimal> serviceByHouse = new java.util.HashMap<>();
        contractRepository.findAll().stream()
                .filter(c -> c.getStatus() != ContractStatus.DRAFT)
                .forEach(c -> {
                    Long houseId = c.getRoom().getBoardingHouse().getId();
                    houseNames.put(houseId, c.getRoom().getBoardingHouse().getName());
                    guestChargeRepository.findByContractIdOrderByChargeDateDesc(c.getId()).stream()
                            .filter(gc -> !gc.getChargeDate().isBefore(startDate) && !gc.getChargeDate().isAfter(endDate))
                            .forEach(gc -> serviceByHouse.merge(houseId, gc.getAmount(), BigDecimal::add));
                });

        // Invoice counts for reference
        Map<Long, Long> invoiceCountByHouse = new java.util.HashMap<>();
        Map<Long, Long> paidCountByHouse = new java.util.HashMap<>();
        invoiceRepository.findAll().stream()
                .filter(inv -> inv.getContract().getStatus() != ContractStatus.DRAFT)
                .filter(inv -> {
                    LocalDate ps = LocalDate.of(inv.getPeriodYear(), inv.getPeriodMonth(), 1);
                    LocalDate pe = ps.withDayOfMonth(ps.lengthOfMonth());
                    return !pe.isBefore(startDate) && !ps.isAfter(endDate);
                })
                .forEach(inv -> {
                    Long houseId = inv.getRoom().getBoardingHouse().getId();
                    invoiceCountByHouse.merge(houseId, 1L, Long::sum);
                    BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                            .map(p -> p.getPaidAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (paid.compareTo(inv.getTotalAmount()) >= 0) {
                        paidCountByHouse.merge(houseId, 1L, Long::sum);
                    }
                });

        java.util.Set<Long> allHouseIds = new java.util.HashSet<>();
        allHouseIds.addAll(roomByHouse.keySet());
        allHouseIds.addAll(serviceByHouse.keySet());

        return allHouseIds.stream().map(houseId -> {
            BigDecimal room = roomByHouse.getOrDefault(houseId, BigDecimal.ZERO);
            BigDecimal svc = serviceByHouse.getOrDefault(houseId, BigDecimal.ZERO);
            RevenueByBoardingHouseDto dto = new RevenueByBoardingHouseDto();
            dto.setBoardingHouseId(houseId);
            dto.setBoardingHouseName(houseNames.getOrDefault(houseId, "Unknown"));
            dto.setTotalRevenue(room.add(svc));
            dto.setInvoiceCount(invoiceCountByHouse.getOrDefault(houseId, 0L));
            dto.setPaidInvoiceCount(paidCountByHouse.getOrDefault(houseId, 0L));
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
                .map((com.boardinghouse.entity.Tenant tenant) -> {
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
                .collect(Collectors.groupingBy(c -> c.getDescription().trim()))
                .entrySet().stream()
                .map(entry -> {
                    ServiceRevenueDto dto = new ServiceRevenueDto();
                    dto.setDescription(entry.getKey());
                    dto.setTotalAmount(entry.getValue().stream()
                            .map(c -> c.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
                    dto.setCount((long) entry.getValue().size());

                    List<ServiceRevenueDto.DetailItem> items = entry.getValue().stream()
                            .sorted((a, b) -> b.getChargeDate().compareTo(a.getChargeDate()))
                            .map(gc -> {
                                ServiceRevenueDto.DetailItem item = new ServiceRevenueDto.DetailItem();
                                item.setChargeDate(gc.getChargeDate());
                                item.setTenantName(gc.getContract().getMainTenant().getFullName());
                                item.setRoomCode(gc.getRoom().getCode());
                                item.setBoardingHouseName(gc.getRoom().getBoardingHouse().getName());
                                item.setQuantity(gc.getQuantity());
                                item.setUnitPrice(gc.getUnitPrice());
                                item.setAmount(gc.getAmount());
                                item.setNote(gc.getNote());
                                return item;
                            }).collect(Collectors.toList());
                    dto.setItems(items);
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

    public java.util.Map<String, Object> getRevenueByBoardingHouseDetail(Long boardingHouseId, LocalDate startDate, LocalDate endDate) {
        // Room revenue from contracts
        java.util.List<java.util.Map<String, Object>> contractRows = new java.util.ArrayList<>();
        BigDecimal totalRoom = BigDecimal.ZERO;
        String houseName = "Unknown";

        for (com.boardinghouse.entity.Contract c : contractRepository.findAll()) {
            if (c.getStatus() == ContractStatus.DRAFT) continue;
            if (!c.getRoom().getBoardingHouse().getId().equals(boardingHouseId)) continue;
            if (c.getEndDate().isBefore(startDate) || c.getStartDate().isAfter(endDate)) continue;
            BigDecimal rate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
            long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal roomCost = rate.multiply(BigDecimal.valueOf(days));
            totalRoom = totalRoom.add(roomCost);
            houseName = c.getRoom().getBoardingHouse().getName();

            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("contractCode", c.getCode());
            row.put("tenantName", c.getMainTenant().getFullName());
            row.put("roomCode", c.getRoom().getCode());
            row.put("days", days);
            row.put("dailyRate", rate);
            row.put("totalAmount", roomCost);
            contractRows.add(row);
        }

        // Service charges
        List<com.boardinghouse.entity.GuestServiceCharge> charges =
                guestChargeRepository.findByChargeDateBetween(startDate, endDate).stream()
                        .filter(gc -> gc.getRoom().getBoardingHouse().getId().equals(boardingHouseId))
                        .sorted((a, b) -> b.getChargeDate().compareTo(a.getChargeDate()))
                        .collect(Collectors.toList());

        java.util.List<java.util.Map<String, Object>> chargeRows = charges.stream().map(gc -> {
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("chargeDate", gc.getChargeDate());
            row.put("description", gc.getDescription());
            row.put("tenantName", gc.getContract().getMainTenant().getFullName());
            row.put("roomCode", gc.getRoom().getCode());
            row.put("quantity", gc.getQuantity());
            row.put("unitPrice", gc.getUnitPrice());
            row.put("amount", gc.getAmount());
            return row;
        }).collect(Collectors.toList());

        BigDecimal totalSvc = charges.stream().map(gc -> gc.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("boardingHouseId", boardingHouseId);
        result.put("boardingHouseName", houseName);
        result.put("totalRevenue", totalRoom.add(totalSvc));
        result.put("totalRoom", totalRoom);
        result.put("totalService", totalSvc);
        result.put("contracts", contractRows);
        result.put("serviceCharges", chargeRows);
        return result;
    }

    public java.util.Map<String, Object> getRevenueByMonthDetail(Integer year, Integer month) {
        LocalDate mStart = LocalDate.of(year, month, 1);
        LocalDate mEnd = mStart.withDayOfMonth(mStart.lengthOfMonth());

        // Room revenue from contracts overlapping this month
        java.util.List<java.util.Map<String, Object>> contractRows = new java.util.ArrayList<>();
        BigDecimal totalRoom = BigDecimal.ZERO;

        for (com.boardinghouse.entity.Contract c : contractRepository.findAll()) {
            if (c.getStatus() == ContractStatus.DRAFT) continue;
            if (c.getEndDate().isBefore(mStart) || c.getStartDate().isAfter(mEnd)) continue;
            BigDecimal rate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
            long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal roomCost = rate.multiply(BigDecimal.valueOf(days));
            totalRoom = totalRoom.add(roomCost);

            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("contractCode", c.getCode());
            row.put("tenantName", c.getMainTenant().getFullName());
            row.put("roomCode", c.getRoom().getCode());
            row.put("boardingHouseName", c.getRoom().getBoardingHouse().getName());
            row.put("days", days);
            row.put("dailyRate", rate);
            row.put("totalAmount", roomCost);
            contractRows.add(row);
        }

        // Service charges for this month
        List<com.boardinghouse.entity.GuestServiceCharge> charges =
                guestChargeRepository.findByChargeDateBetween(mStart, mEnd);

        java.util.List<java.util.Map<String, Object>> chargeRows = charges.stream()
                .sorted((a, b) -> b.getChargeDate().compareTo(a.getChargeDate()))
                .map(gc -> {
                    java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
                    row.put("chargeDate", gc.getChargeDate());
                    row.put("description", gc.getDescription());
                    row.put("tenantName", gc.getContract().getMainTenant().getFullName());
                    row.put("roomCode", gc.getRoom().getCode());
                    row.put("boardingHouseName", gc.getRoom().getBoardingHouse().getName());
                    row.put("quantity", gc.getQuantity());
                    row.put("unitPrice", gc.getUnitPrice());
                    row.put("amount", gc.getAmount());
                    return row;
                }).collect(Collectors.toList());

        BigDecimal totalSvc = charges.stream().map(gc -> gc.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Collected = payments in this month
        BigDecimal totalCollected = paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentDate() != null)
                .filter(p -> {
                    LocalDate pd = p.getPaymentDate().toLocalDate();
                    return !pd.isBefore(mStart) && !pd.isAfter(mEnd);
                })
                .map(p -> p.getPaidAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("year", year);
        result.put("month", month);
        result.put("totalEarned", totalRoom.add(totalSvc));
        result.put("totalCollected", totalCollected);
        result.put("contracts", contractRows);
        result.put("serviceCharges", chargeRows);
        return result;
    }
}

