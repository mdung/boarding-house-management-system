package com.boardinghouse.service;

import com.boardinghouse.dto.CalendarEventDto;
import com.boardinghouse.dto.CalendarDayDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CalendarService {
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final GuestServiceChargeRepository guestChargeRepository;

    public CalendarService(ContractRepository contractRepository,
                           InvoiceRepository invoiceRepository,
                           PaymentRepository paymentRepository,
                           GuestServiceChargeRepository guestChargeRepository) {
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.guestChargeRepository = guestChargeRepository;
    }

    /**
     * Returns flat list of CalendarEventDto for the Super Calendar frontend.
     * Event types: CHECKIN, CHECKOUT, INVOICE_DUE, PAYMENT, OVERDUE
     */
    public List<CalendarEventDto> getEvents(LocalDate from, LocalDate to) {
        List<CalendarEventDto> result = new ArrayList<>();
        List<Contract> contracts = contractRepository.findContractsInRange(from, to);

        for (Contract c : contracts) {
            // CHECKIN events
            if (!c.getStartDate().isBefore(from) && !c.getStartDate().isAfter(to)) {
                result.add(buildContractEvent(c, "CHECKIN", c.getStartDate()));
            }
            // CHECKOUT events
            if (!c.getEndDate().isBefore(from) && !c.getEndDate().isAfter(to)) {
                result.add(buildContractEvent(c, "CHECKOUT", c.getEndDate()));
            }

            // Invoice-related events
            List<Invoice> invoices = invoiceRepository.findByContractId(c.getId());
            for (Invoice inv : invoices) {
                BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                        .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal remaining = inv.getTotalAmount().subtract(paid);

                // INVOICE_DUE - on due date, if not fully paid
                if (inv.getDueDate() != null && !inv.getDueDate().isBefore(from) && !inv.getDueDate().isAfter(to)) {
                    if (inv.getStatus() != PaymentStatus.PAID) {
                        CalendarEventDto ev = buildInvoiceEvent(c, inv, paid, remaining);
                        ev.setType("INVOICE_DUE");
                        ev.setDate(inv.getDueDate());
                        result.add(ev);
                    }
                }

                // OVERDUE - show on today if past due and unpaid
                LocalDate today = LocalDate.now();
                if (inv.getDueDate() != null && inv.getDueDate().isBefore(today)
                        && inv.getStatus() != PaymentStatus.PAID
                        && !today.isBefore(from) && !today.isAfter(to)) {
                    CalendarEventDto ev = buildInvoiceEvent(c, inv, paid, remaining);
                    ev.setType("OVERDUE");
                    ev.setDate(today);
                    result.add(ev);
                }

                // PAYMENT events - on actual payment dates
                for (Payment p : paymentRepository.findByInvoiceId(inv.getId())) {
                    LocalDate payDate = p.getPaymentDate().toLocalDate();
                    if (!payDate.isBefore(from) && !payDate.isAfter(to)) {
                        CalendarEventDto ev = buildInvoiceEvent(c, inv, paid, remaining);
                        ev.setType("PAYMENT");
                        ev.setDate(payDate);
                        ev.setAmount(p.getPaidAmount());
                        result.add(ev);
                    }
                }
            }
        }

        // Sort by date
        result.sort(Comparator.comparing(CalendarEventDto::getDate));
        return result;
    }

    private CalendarEventDto buildContractEvent(Contract c, String type, LocalDate date) {
        CalendarEventDto ev = new CalendarEventDto();
        ev.setType(type);
        ev.setDate(date);
        ev.setContractId(c.getId());
        ev.setTenantId(c.getMainTenant().getId());
        ev.setTenantName(c.getMainTenant().getFullName());
        ev.setRoomCode(c.getRoom().getCode());
        ev.setBoardingHouseName(c.getRoom().getBoardingHouse().getName());
        ev.setCheckInDate(c.getStartDate());
        ev.setCheckOutDate(c.getEndDate());
        BigDecimal daily = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
        ev.setDailyRate(daily);

        // Calculate total debt for this contract
        List<Invoice> invoices = invoiceRepository.findByContractId(c.getId());
        BigDecimal totalPaid = invoices.stream()
                .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDebt;
        if (!invoices.isEmpty()) {
            // Use invoiced amount as source of truth (SUM invoice already includes charges)
            BigDecimal totalInvoiced = invoices.stream()
                    .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            totalDebt = totalInvoiced.subtract(totalPaid);
        } else {
            // No invoice yet — estimate from room cost + charges
            long nights = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()));
            BigDecimal roomCost = daily.multiply(BigDecimal.valueOf(nights));
            BigDecimal charges = guestChargeRepository.sumAmountByContractId(c.getId());
            totalDebt = roomCost.add(charges).subtract(totalPaid);
        }
        ev.setTotalDebt(totalDebt.max(BigDecimal.ZERO));
        return ev;
    }

    private CalendarEventDto buildInvoiceEvent(Contract c, Invoice inv, BigDecimal paid, BigDecimal remaining) {
        CalendarEventDto ev = new CalendarEventDto();
        ev.setContractId(c.getId());
        ev.setTenantId(c.getMainTenant().getId());
        ev.setTenantName(c.getMainTenant().getFullName());
        ev.setRoomCode(c.getRoom().getCode());
        ev.setBoardingHouseName(c.getRoom().getBoardingHouse().getName());
        ev.setCheckInDate(c.getStartDate());
        ev.setCheckOutDate(c.getEndDate());
        ev.setInvoiceId(inv.getId());
        ev.setInvoiceCode(inv.getCode());
        ev.setAmount(inv.getTotalAmount());
        ev.setPaidAmount(paid);
        ev.setRemainingAmount(remaining);
        ev.setInvoiceStatus(inv.getStatus().name());
        return ev;
    }

    // Keep old method for backward compatibility (Dashboard uses it)
    public List<CalendarDayDto> getCalendarData(LocalDate startDate, LocalDate endDate) {
        List<Contract> allActive = contractRepository.findAllActiveOrderByEndDate();
        Map<LocalDate, List<CalendarDayDto.CalendarEventDto>> dayMap = new LinkedHashMap<>();

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            dayMap.put(d, new ArrayList<>());
        }

        Map<Long, BigDecimal[]> debtCache = new HashMap<>();

        for (Contract c : allActive) {
            if (c.getEndDate().isBefore(startDate) || c.getStartDate().isAfter(endDate)) continue;

            BigDecimal[] debtInfo = debtCache.computeIfAbsent(c.getId(), id -> {
                BigDecimal invoiceTotal = invoiceRepository.findByContractId(id).stream()
                        .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal paid = invoiceRepository.findByContractId(id).stream()
                        .flatMap(inv -> paymentRepository.findByInvoiceId(inv.getId()).stream())
                        .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal charges = guestChargeRepository.sumAmountByContractId(id);
                long unpaidCount = invoiceRepository.findByContractId(id).stream()
                        .filter(inv -> inv.getStatus() != PaymentStatus.PAID).count();
                BigDecimal unpaidAmt = invoiceRepository.findByContractId(id).stream()
                        .filter(inv -> inv.getStatus() != PaymentStatus.PAID)
                        .map(inv -> inv.getTotalAmount().subtract(
                                paymentRepository.findByInvoiceId(inv.getId()).stream()
                                        .map(Payment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add)))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new BigDecimal[]{invoiceTotal.add(charges).subtract(paid), paid, BigDecimal.valueOf(unpaidCount), unpaidAmt};
            });

            CalendarDayDto.CalendarEventDto base = buildDayEvent(c, debtInfo);

            if (!c.getStartDate().isBefore(startDate) && !c.getStartDate().isAfter(endDate)) {
                CalendarDayDto.CalendarEventDto ev = cloneDayEvent(base);
                ev.setEventType("CHECKIN");
                dayMap.get(c.getStartDate()).add(ev);
            }
            if (!c.getEndDate().isBefore(startDate) && !c.getEndDate().isAfter(endDate)) {
                CalendarDayDto.CalendarEventDto ev = cloneDayEvent(base);
                ev.setEventType("CHECKOUT");
                dayMap.get(c.getEndDate()).add(ev);
            }

            LocalDate stayStart = c.getStartDate().plusDays(1).isBefore(startDate) ? startDate : c.getStartDate().plusDays(1);
            LocalDate stayEnd = c.getEndDate().minusDays(1).isAfter(endDate) ? endDate : c.getEndDate().minusDays(1);
            for (LocalDate d = stayStart; !d.isAfter(stayEnd); d = d.plusDays(1)) {
                if (dayMap.containsKey(d)) {
                    CalendarDayDto.CalendarEventDto ev = cloneDayEvent(base);
                    ev.setEventType("STAYING");
                    dayMap.get(d).add(ev);
                }
            }
        }

        return dayMap.entrySet().stream().map(e -> {
            CalendarDayDto day = new CalendarDayDto();
            day.setDate(e.getKey());
            day.setEvents(e.getValue());
            return day;
        }).collect(Collectors.toList());
    }

    private CalendarDayDto.CalendarEventDto buildDayEvent(Contract c, BigDecimal[] debtInfo) {
        CalendarDayDto.CalendarEventDto ev = new CalendarDayDto.CalendarEventDto();
        ev.setContractId(c.getId());
        ev.setTenantId(c.getMainTenant().getId());
        ev.setTenantName(c.getMainTenant().getFullName());
        ev.setTenantPhone(c.getMainTenant().getPhone());
        ev.setRoomCode(c.getRoom().getCode());
        ev.setBoardingHouseName(c.getRoom().getBoardingHouse().getName());
        ev.setCheckInDate(c.getStartDate());
        ev.setCheckOutDate(c.getEndDate());
        BigDecimal dailyRate = c.getDailyRate() != null ? c.getDailyRate() : BigDecimal.ZERO;
        ev.setDailyRate(dailyRate);
        ev.setTotalDays((int) Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate())));
        ev.setTotalDebt(debtInfo[0]);
        ev.setTotalPaid(debtInfo[1]);
        ev.setUnpaidInvoices(debtInfo[2].intValue());
        ev.setUnpaidAmount(debtInfo[3]);
        return ev;
    }

    private CalendarDayDto.CalendarEventDto cloneDayEvent(CalendarDayDto.CalendarEventDto src) {
        CalendarDayDto.CalendarEventDto ev = new CalendarDayDto.CalendarEventDto();
        ev.setContractId(src.getContractId());
        ev.setTenantId(src.getTenantId());
        ev.setTenantName(src.getTenantName());
        ev.setTenantPhone(src.getTenantPhone());
        ev.setRoomCode(src.getRoomCode());
        ev.setBoardingHouseName(src.getBoardingHouseName());
        ev.setCheckInDate(src.getCheckInDate());
        ev.setCheckOutDate(src.getCheckOutDate());
        ev.setEventType(src.getEventType());
        ev.setDailyRate(src.getDailyRate());
        ev.setTotalDays(src.getTotalDays());
        ev.setTotalDebt(src.getTotalDebt());
        ev.setTotalPaid(src.getTotalPaid());
        ev.setUnpaidInvoices(src.getUnpaidInvoices());
        ev.setUnpaidAmount(src.getUnpaidAmount());
        return ev;
    }
}
