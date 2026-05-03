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
        return getDashboard(null);
    }

    public DashboardDto getDashboard(Long boardingHouseId) {
        // Auto-expire contracts where endDate < today → free rooms
        contractService.autoExpireContracts();

        DashboardDto dto = new DashboardDto();

        // Filter rooms by boarding house if specified
        List<com.boardinghouse.entity.Room> allRooms = boardingHouseId != null
                ? roomRepository.findByBoardingHouseId(boardingHouseId)
                : roomRepository.findAll();

        dto.setTotalRooms((long) allRooms.size());
        dto.setOccupiedRooms(allRooms.stream().filter(r -> r.getStatus() == RoomStatus.OCCUPIED).count());
        dto.setAvailableRooms(allRooms.stream().filter(r -> r.getStatus() == RoomStatus.AVAILABLE).count());
        dto.setMaintenanceRooms(allRooms.stream().filter(r -> r.getStatus() == RoomStatus.MAINTENANCE).count());

        LocalDate today = LocalDate.now();

        // Filter contracts by boarding house if specified
        List<Contract> allContracts = contractRepository.findAll().stream()
                .filter(c -> boardingHouseId == null || c.getRoom().getBoardingHouse().getId().equals(boardingHouseId))
                .collect(Collectors.toList());

        // Outstanding debts: ALL non-DRAFT contracts with debt > 0
        // debt = roomCost + charges - paid (contract-level, same as guest detail modal)
        List<DashboardDto.GuestActivityDto> outstandingDebts = new java.util.ArrayList<>();
        for (Contract c : allContracts) {
            if (c.getStatus() == ContractStatus.DRAFT) continue;
            DashboardDto.GuestActivityDto g = toGuestActivity(c, "DEBT");
            if (g.getTotalDebt().compareTo(BigDecimal.ZERO) > 0) {
                outstandingDebts.add(g);
            }
        }
        outstandingDebts.sort((a, b) -> b.getTotalDebt().compareTo(a.getTotalDebt()));
        dto.setOutstandingDebts(outstandingDebts);

        // unpaidAmount and overdueCount derived from outstandingDebts for consistency
        // A debt is "overdue" when the contract end date (checkOutDate) has passed
        BigDecimal unpaidAmount = outstandingDebts.stream()
                .map(DashboardDto.GuestActivityDto::getTotalDebt)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long overdueCount = outstandingDebts.stream()
                .filter(g -> g.getCheckOutDate() != null && g.getCheckOutDate().isBefore(today))
                .count();

        dto.setUnpaidAmount(unpaidAmount);
        dto.setOverdueInvoices(overdueCount);

        // Revenue breakdown: Room vs Service for THIS MONTH
        // Room revenue = dailyRate x days for all non-DRAFT contracts that overlap this month
        // Service revenue = sum of guest charges where chargeDate in this month
        LocalDate firstOfMonth = today.withDayOfMonth(1);
        LocalDate lastOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        BigDecimal roomRevenue = BigDecimal.ZERO;
        BigDecimal serviceRevenue = BigDecimal.ZERO;
        java.util.List<DashboardDto.RevenueDetailDto> details = new java.util.ArrayList<>();

        // Room revenue = dailyRate x days for contracts active this month
        for (Contract c : allContracts) {
            if (c.getStatus() == ContractStatus.DRAFT) continue;
            // Contract must overlap with this month
            if (c.getEndDate().isBefore(firstOfMonth) || c.getStartDate().isAfter(lastOfMonth)) continue;
            BigDecimal rate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
            if (rate.compareTo(BigDecimal.ZERO) == 0) continue;
            long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal amount = rate.multiply(BigDecimal.valueOf(days));
            roomRevenue = roomRevenue.add(amount);

            DashboardDto.RevenueDetailDto rd = new DashboardDto.RevenueDetailDto();
            rd.setDate(c.getStartDate());
            rd.setInvoiceCode(c.getCode());
            rd.setRoomCode(c.getRoom().getCode());
            rd.setTenantName(c.getMainTenant().getFullName());
            rd.setBoardingHouseName(c.getRoom().getBoardingHouse().getName());
            rd.setDescription(days + " days x " + rate + "/day");
            rd.setCategory("RENT");
            rd.setAmount(amount);
            details.add(rd);
        }

        // Service revenue from guest charges this month
        for (Contract contract : allContracts) {
            if (contract.getStatus() == ContractStatus.DRAFT) continue;
            List<com.boardinghouse.entity.GuestServiceCharge> gCharges =
                    guestChargeRepository.findByContractIdOrderByChargeDateDesc(contract.getId());
            for (com.boardinghouse.entity.GuestServiceCharge gc : gCharges) {
                if (gc.getChargeDate().isBefore(firstOfMonth) || gc.getChargeDate().isAfter(lastOfMonth)) continue;
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
                sd.setQuantity(gc.getQuantity());
                sd.setUnitPrice(gc.getUnitPrice());
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

        dto.setYesterday(buildDayActivity(today.minusDays(1), boardingHouseId));
        dto.setToday(buildDayActivity(today, boardingHouseId));
        dto.setTomorrow(buildDayActivity(today.plusDays(1), boardingHouseId));

        return dto;
    }

    public DashboardDto.DayActivityDto getDayActivity(LocalDate date, Long boardingHouseId) {
        return buildDayActivity(date, boardingHouseId);
    }

    private DashboardDto.DayActivityDto buildDayActivity(LocalDate date) {
        return buildDayActivity(date, null);
    }

    private DashboardDto.DayActivityDto buildDayActivity(LocalDate date, Long boardingHouseId) {
        // Use ALL contracts except DRAFT so checked-out guests still appear
        List<Contract> all = contractRepository.findAll().stream()
                .filter(c -> c.getStatus() != ContractStatus.DRAFT)
                .filter(c -> boardingHouseId == null || c.getRoom().getBoardingHouse().getId().equals(boardingHouseId))
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
        BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
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

