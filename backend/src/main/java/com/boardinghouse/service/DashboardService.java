package com.boardinghouse.service;

import com.boardinghouse.dto.DashboardDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final ContractRepository contractRepository;
    private final GuestServiceChargeRepository guestChargeRepository;

    public DashboardService(RoomRepository roomRepository, InvoiceRepository invoiceRepository,
                            PaymentRepository paymentRepository, ContractRepository contractRepository,
                            GuestServiceChargeRepository guestChargeRepository) {
        this.roomRepository = roomRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.contractRepository = contractRepository;
        this.guestChargeRepository = guestChargeRepository;
    }

    public DashboardDto getDashboard() {
        DashboardDto dto = new DashboardDto();

        dto.setTotalRooms((long) roomRepository.findAll().size());
        dto.setOccupiedRooms((long) roomRepository.findByStatus(RoomStatus.OCCUPIED).size());
        dto.setAvailableRooms((long) roomRepository.findByStatus(RoomStatus.AVAILABLE).size());
        dto.setMaintenanceRooms((long) roomRepository.findByStatus(RoomStatus.MAINTENANCE).size());

        // Monthly Revenue = sum of all payments made in the current month
        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();
        BigDecimal monthlyRevenue = paymentRepository.findAll().stream()
                .filter(p -> {
                    LocalDate payDate = p.getPaymentDate().toLocalDate();
                    return !payDate.isBefore(monthStart) && !payDate.isAfter(monthEnd);
                })
                .map(Payment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Unpaid Amount = sum of (totalAmount - paidAmount) for all invoices where remaining > 0
        BigDecimal unpaidAmount = BigDecimal.ZERO;
        long overdueCount = 0;
        LocalDate today = LocalDate.now();
        for (Invoice inv : invoiceRepository.findAll()) {
            BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                    .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = inv.getTotalAmount().subtract(paid);
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                unpaidAmount = unpaidAmount.add(remaining);
                // Overdue = unpaid and past due date
                if (inv.getDueDate() != null && inv.getDueDate().isBefore(today)) {
                    overdueCount++;
                }
            }
        }

        dto.setMonthlyRevenue(monthlyRevenue);
        dto.setUnpaidAmount(unpaidAmount);
        dto.setOverdueInvoices(overdueCount);

        // Revenue breakdown: Room vs Service for current month
        // Based on contracts that have payments in current month
        BigDecimal roomRevenue = BigDecimal.ZERO;
        BigDecimal serviceRevenue = BigDecimal.ZERO;
        java.util.List<DashboardDto.RevenueDetailDto> details = new java.util.ArrayList<>();

        // Get all payments made in current month
        List<Payment> monthPayments = paymentRepository.findAll().stream()
                .filter(p -> {
                    LocalDate pd = p.getPaymentDate().toLocalDate();
                    return !pd.isBefore(monthStart) && !pd.isAfter(monthEnd);
                })
                .collect(Collectors.toList());

        // Group payments by contract via invoice
        java.util.Map<Long, BigDecimal> contractPaidMap = new java.util.HashMap<>();
        for (Payment p : monthPayments) {
            Long contractId = p.getInvoice().getContract().getId();
            contractPaidMap.merge(contractId, p.getPaidAmount(), BigDecimal::add);
        }

        // For each contract with payments this month, calculate room vs service split
        for (java.util.Map.Entry<Long, BigDecimal> entry : contractPaidMap.entrySet()) {
            Long contractId = entry.getKey();
            BigDecimal paidThisMonth = entry.getValue();

            Contract contract = contractRepository.findById(contractId).orElse(null);
            if (contract == null) continue;

            long nights = ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate());
            BigDecimal dailyRate = contract.getDailyRate() != null ? contract.getDailyRate()
                    : (contract.getMonthlyRent() != null
                        ? contract.getMonthlyRent().divide(BigDecimal.valueOf(30), 4, java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
            BigDecimal roomCost = dailyRate.multiply(BigDecimal.valueOf(nights));
            BigDecimal charges = guestChargeRepository.sumAmountByContractId(contractId);
            BigDecimal totalBill = roomCost.add(charges);

            // Prorate paid amount between room and service
            if (totalBill.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal roomRatio = roomCost.divide(totalBill, 4, java.math.RoundingMode.HALF_UP);
                BigDecimal roomPaid = paidThisMonth.multiply(roomRatio).setScale(0, java.math.RoundingMode.HALF_UP);
                BigDecimal servicePaid = paidThisMonth.subtract(roomPaid);

                roomRevenue = roomRevenue.add(roomPaid);
                serviceRevenue = serviceRevenue.add(servicePaid);

                // Add room detail row
                if (roomPaid.compareTo(BigDecimal.ZERO) > 0) {
                    DashboardDto.RevenueDetailDto d = new DashboardDto.RevenueDetailDto();
                    d.setDate(contract.getStartDate());
                    d.setInvoiceCode("SUM-" + contract.getCode());
                    d.setRoomCode(contract.getRoom().getCode());
                    d.setTenantName(contract.getMainTenant().getFullName());
                    d.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
                    d.setDescription("Room (" + nights + " nights × " + dailyRate.setScale(0, java.math.RoundingMode.HALF_UP) + ")");
                    d.setCategory("RENT");
                    d.setAmount(roomCost);
                    d.setPaidAmount(roomPaid);
                    details.add(d);
                }

                // Add service detail rows from guest charges
                if (servicePaid.compareTo(BigDecimal.ZERO) > 0) {
                    List<com.boardinghouse.entity.GuestServiceCharge> gCharges =
                            guestChargeRepository.findByContractIdOrderByChargeDateDesc(contractId);
                    for (com.boardinghouse.entity.GuestServiceCharge gc : gCharges) {
                        DashboardDto.RevenueDetailDto d = new DashboardDto.RevenueDetailDto();
                        d.setDate(gc.getChargeDate());
                        d.setInvoiceCode("SUM-" + contract.getCode());
                        d.setRoomCode(contract.getRoom().getCode());
                        d.setTenantName(contract.getMainTenant().getFullName());
                        d.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
                        d.setDescription(gc.getDescription());
                        d.setCategory("SERVICE");
                        d.setAmount(gc.getAmount());
                        // Prorate paid for this charge
                        BigDecimal chargePaid = charges.compareTo(BigDecimal.ZERO) > 0
                                ? gc.getAmount().divide(charges, 4, java.math.RoundingMode.HALF_UP).multiply(servicePaid).setScale(0, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        d.setPaidAmount(chargePaid);
                        details.add(d);
                    }
                }
            }
        }

        dto.setRoomRevenue(roomRevenue);
        dto.setServiceRevenue(serviceRevenue);
        details.sort((a, b) -> {
            int cmp = a.getDate().compareTo(b.getDate());
            return cmp != 0 ? cmp : a.getRoomCode().compareTo(b.getRoomCode());
        });
        dto.setRevenueDetails(details);

        dto.setYesterday(buildDayActivity(today.minusDays(1)));
        dto.setToday(buildDayActivity(today));
        dto.setTomorrow(buildDayActivity(today.plusDays(1)));

        return dto;
    }

    private DashboardDto.DayActivityDto buildDayActivity(LocalDate date) {
        List<Contract> allActive = contractRepository.findAllActiveOrderByEndDate();

        DashboardDto.DayActivityDto day = new DashboardDto.DayActivityDto();

        day.setCheckIns(allActive.stream()
                .filter(c -> c.getStartDate().equals(date))
                .map(c -> toGuestActivity(c, "CHECKIN"))
                .collect(Collectors.toList()));

        day.setCheckOuts(allActive.stream()
                .filter(c -> c.getEndDate().equals(date))
                .map(c -> toGuestActivity(c, "CHECKOUT"))
                .collect(Collectors.toList()));

        day.setStaying(allActive.stream()
                .filter(c -> c.getStartDate().isBefore(date) && c.getEndDate().isAfter(date))
                .map(c -> toGuestActivity(c, "STAYING"))
                .collect(Collectors.toList()));

        return day;
    }

    private DashboardDto.GuestActivityDto toGuestActivity(Contract c, String type) {
        DashboardDto.GuestActivityDto g = new DashboardDto.GuestActivityDto();
        g.setContractId(c.getId());
        g.setTenantId(c.getMainTenant().getId());
        g.setTenantName(c.getMainTenant().getFullName());
        g.setTenantPhone(c.getMainTenant().getPhone());
        g.setRoomCode(c.getRoom().getCode());
        g.setBoardingHouseName(c.getRoom().getBoardingHouse().getName());
        g.setCheckInDate(c.getStartDate());
        g.setCheckOutDate(c.getEndDate());
        g.setActivityType(type);

        // Daily rate & total days
        BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate()
                : (c.getMonthlyRent() != null ? c.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO);
        g.setDailyRate(dailyRate);

        long days = ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate());
        g.setTotalDays((int) days);
        g.setTotalRoomCost(dailyRate.multiply(BigDecimal.valueOf(days)));

        // Charges
        BigDecimal charges = guestChargeRepository.sumAmountByContractId(c.getId());
        g.setTotalCharges(charges);

        // Paid
        BigDecimal paid = invoiceRepository.findByContractId(c.getId()).stream()
                .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        g.setTotalPaid(paid);

        // Debt = roomCost + guestCharges - paid (consistent with guest summary modal)
        g.setTotalDebt(g.getTotalRoomCost().add(charges).subtract(paid));

        return g;
    }
}

