package com.boardinghouse.service;

import com.boardinghouse.dto.DashboardDto;
import com.boardinghouse.entity.PaymentStatus;
import com.boardinghouse.entity.RoomStatus;
import com.boardinghouse.repository.InvoiceRepository;
import com.boardinghouse.repository.PaymentRepository;
import com.boardinghouse.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

@Service
public class DashboardService {
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public DashboardService(RoomRepository roomRepository, InvoiceRepository invoiceRepository,
                           PaymentRepository paymentRepository) {
        this.roomRepository = roomRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    public DashboardDto getDashboard() {
        DashboardDto dto = new DashboardDto();

        // Room statistics
        dto.setTotalRooms((long) roomRepository.findAll().size());
        dto.setOccupiedRooms((long) roomRepository.findByStatus(RoomStatus.OCCUPIED).size());
        dto.setAvailableRooms((long) roomRepository.findByStatus(RoomStatus.AVAILABLE).size());
        dto.setMaintenanceRooms((long) roomRepository.findByStatus(RoomStatus.MAINTENANCE).size());

        // Current month revenue and unpaid
        YearMonth currentMonth = YearMonth.now();
        LocalDate startOfMonth = currentMonth.atDay(1);
        LocalDate endOfMonth = currentMonth.atEndOfMonth();

        BigDecimal monthlyRevenue = invoiceRepository.findAll().stream()
                .filter(inv -> inv.getPeriodYear() == currentMonth.getYear() &&
                        inv.getPeriodMonth() == currentMonth.getMonthValue() &&
                        inv.getStatus() == PaymentStatus.PAID)
                .map(inv -> {
                    BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                            .map(p -> p.getPaidAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return paid;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal unpaidAmount = invoiceRepository.findByStatus(PaymentStatus.UNPAID).stream()
                .map(inv -> inv.getTotalAmount().subtract(
                        paymentRepository.findByInvoiceId(inv.getId()).stream()
                                .map(p -> p.getPaidAmount())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Long overdueCount = (long) invoiceRepository.findByStatus(PaymentStatus.OVERDUE).size();

        dto.setMonthlyRevenue(monthlyRevenue);
        dto.setUnpaidAmount(unpaidAmount);
        dto.setOverdueInvoices(overdueCount);

        return dto;
    }
}

