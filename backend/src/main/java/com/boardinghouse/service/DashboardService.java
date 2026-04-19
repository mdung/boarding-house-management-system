package com.boardinghouse.service;

import com.boardinghouse.dto.DashboardDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
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
    private final InventoryItemRepository inventoryItemRepository;
    private final ContractService contractService;

    public DashboardService(RoomRepository roomRepository, InvoiceRepository invoiceRepository,
                            PaymentRepository paymentRepository, ContractRepository contractRepository,
                            GuestServiceChargeRepository guestChargeRepository,
                            InventoryItemRepository inventoryItemRepository,
                            ContractService contractService) {
        this.roomRepository = roomRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.contractRepository = contractRepository;
        this.guestChargeRepository = guestChargeRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.contractService = contractService;
    }

    public DashboardDto getDashboard() {
        // Auto-expire contracts where endDate < today → free rooms
        contractService.autoExpireContracts();

        DashboardDto dto = new DashboardDto();

        dto.setTotalRooms((long) roomRepository.findAll().size());
        dto.setOccupiedRooms((long) roomRepository.findByStatus(RoomStatus.OCCUPIED).size());
        dto.setAvailableRooms((long) roomRepository.findByStatus(RoomStatus.AVAILABLE).size());
        dto.setMaintenanceRooms((long) roomRepository.findByStatus(RoomStatus.MAINTENANCE).size());

        LocalDate today = LocalDate.now();

        // Unpaid = sum of debt across ALL contracts (including expired)
        // Debt per contract = (dailyRate × nights) + guestCharges - totalPaid
        // This matches the red "Debt" numbers shown on guest cards and tenant list
        BigDecimal unpaidAmount = BigDecimal.ZERO;
        List<Contract> allContracts = contractRepository.findAll();
        for (Contract c : allContracts) {
            long nights = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate()
                    : (c.getMonthlyRent() != null
                        ? c.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
            BigDecimal roomCost = dailyRate.multiply(BigDecimal.valueOf(nights));
            BigDecimal charges = guestChargeRepository.sumAmountByContractId(c.getId());
            BigDecimal paid = invoiceRepository.findByContractId(c.getId()).stream()
                    .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                    .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal debt = roomCost.add(charges).subtract(paid);
            if (debt.compareTo(BigDecimal.ZERO) > 0) {
                unpaidAmount = unpaidAmount.add(debt);
            }
        }

        // Overdue invoices = invoices with remaining > 0 and past due date
        long overdueCount = 0;
        for (Invoice inv : invoiceRepository.findAll()) {
            BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                    .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = inv.getTotalAmount().subtract(paid);
            if (remaining.compareTo(BigDecimal.ZERO) > 0 && inv.getDueDate() != null && inv.getDueDate().isBefore(today)) {
                overdueCount++;
            }
        }

        dto.setMonthlyRevenue(BigDecimal.ZERO); // hidden on frontend
        dto.setUnpaidAmount(unpaidAmount);
        dto.setOverdueInvoices(overdueCount);

        // Revenue breakdown: Room vs Service for ALL contracts (including expired/checked-out)
        BigDecimal roomRevenue = BigDecimal.ZERO;
        BigDecimal serviceRevenue = BigDecimal.ZERO;
        java.util.List<DashboardDto.RevenueDetailDto> details = new java.util.ArrayList<>();

        for (Contract contract : allContracts) {
            if (contract.getStatus() == ContractStatus.DRAFT) continue;

            long nights = Math.max(1, ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate()));
            BigDecimal dailyRate = contract.getDailyRate() != null ? contract.getDailyRate()
                    : (contract.getMonthlyRent() != null
                        ? contract.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
            BigDecimal roomCost = dailyRate.multiply(BigDecimal.valueOf(nights));
            roomRevenue = roomRevenue.add(roomCost);

            // Room detail row
            DashboardDto.RevenueDetailDto rd = new DashboardDto.RevenueDetailDto();
            rd.setDate(contract.getStartDate());
            rd.setInvoiceCode(contract.getCode());
            rd.setRoomCode(contract.getRoom().getCode());
            rd.setTenantName(contract.getMainTenant().getFullName());
            rd.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
            rd.setDescription("Room (" + nights + " nights × " + dailyRate.setScale(0, java.math.RoundingMode.HALF_UP) + ")");
            rd.setCategory("RENT");
            rd.setAmount(roomCost);
            details.add(rd);

            // Guest service charges as service revenue
            List<com.boardinghouse.entity.GuestServiceCharge> gCharges =
                    guestChargeRepository.findByContractIdOrderByChargeDateDesc(contract.getId());
            for (com.boardinghouse.entity.GuestServiceCharge gc : gCharges) {
                serviceRevenue = serviceRevenue.add(gc.getAmount());

                DashboardDto.RevenueDetailDto sd = new DashboardDto.RevenueDetailDto();
                sd.setDate(gc.getChargeDate());
                sd.setInvoiceCode(contract.getCode());
                sd.setRoomCode(contract.getRoom().getCode());
                sd.setTenantName(contract.getMainTenant().getFullName());
                sd.setBoardingHouseName(contract.getRoom().getBoardingHouse().getName());
                sd.setDescription(gc.getDescription());
                sd.setCategory("SERVICE");
                sd.setAmount(gc.getAmount());
                details.add(sd);
            }
        }

        dto.setRoomRevenue(roomRevenue);
        dto.setServiceRevenue(serviceRevenue);
        details.sort((a, b) -> {
            int cmp = a.getDate().compareTo(b.getDate());
            return cmp != 0 ? cmp : a.getRoomCode().compareTo(b.getRoomCode());
        });
        dto.setRevenueDetails(details);

        // Low stock items count
        long lowStockCount = inventoryItemRepository.findByIsActiveTrueOrderByCategoryAscNameAsc().stream()
                .filter(item -> item.getQuantityOnHand().compareTo(item.getReorderLevel()) <= 0)
                .count();
        dto.setLowStockItems(lowStockCount);

        dto.setYesterday(buildDayActivity(today.minusDays(1)));
        dto.setToday(buildDayActivity(today));
        dto.setTomorrow(buildDayActivity(today.plusDays(1)));

        return dto;
    }

    private DashboardDto.DayActivityDto buildDayActivity(LocalDate date) {
        // Use ALL contracts except DRAFT so checked-out guests still appear
        List<Contract> all = contractRepository.findAll().stream()
                .filter(c -> c.getStatus() != ContractStatus.DRAFT)
                .collect(Collectors.toList());

        DashboardDto.DayActivityDto day = new DashboardDto.DayActivityDto();

        day.setCheckIns(all.stream()
                .filter(c -> c.getStartDate().equals(date))
                .map(c -> toGuestActivity(c, "CHECKIN"))
                .collect(Collectors.toList()));

        day.setCheckOuts(all.stream()
                .filter(c -> c.getEndDate().equals(date))
                .map(c -> toGuestActivity(c, "CHECKOUT"))
                .collect(Collectors.toList()));

        day.setStaying(all.stream()
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
        g.setContractStatus(c.getStatus().name());
        g.setRoomReleased(isRoomReleased(c));

        // Daily rate & total days
        BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate()
                : (c.getMonthlyRent() != null ? c.getMonthlyRent().divide(BigDecimal.valueOf(30), 0, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO);
        g.setDailyRate(dailyRate);

        long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
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

    /**
     * A contract is "room released" when the guest has physically left.
     * - roomReleased = true → explicitly checked out
     * - TERMINATED/EXPIRED → always considered checked out
     * - ACTIVE + roomReleased false/null → still staying
     */
    private boolean isRoomReleased(Contract c) {
        if (Boolean.TRUE.equals(c.getRoomReleased())) return true;
        return c.getStatus() == ContractStatus.TERMINATED || c.getStatus() == ContractStatus.EXPIRED;
    }
}

