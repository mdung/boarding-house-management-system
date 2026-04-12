package com.boardinghouse.config;

import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BoardingHouseRepository boardingHouseRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final ContractRepository contractRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final GuestServiceChargeRepository guestServiceChargeRepository;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder,
                     BoardingHouseRepository boardingHouseRepository, RoomRepository roomRepository,
                     TenantRepository tenantRepository, ContractRepository contractRepository,
                     ServiceTypeRepository serviceTypeRepository, RoomServiceRepository roomServiceRepository,
                     InvoiceRepository invoiceRepository, PaymentRepository paymentRepository,
                     GuestServiceChargeRepository guestServiceChargeRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.boardingHouseRepository = boardingHouseRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
        this.contractRepository = contractRepository;
        this.serviceTypeRepository = serviceTypeRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.guestServiceChargeRepository = guestServiceChargeRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedData();
        }
    }

    private void seedData() {
        // ============ USERS ============
        User admin = new User();
        admin.setUsername("admin"); admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("Nguyen Minh Quan"); admin.setEmail("admin@nhatro.com"); admin.setPhone("0901234567");
        Set<Role> adminRoles = new HashSet<>(); adminRoles.add(Role.ADMIN);
        admin.setRoles(adminRoles); admin.setActive(true);
        admin = userRepository.save(admin);

        User u1 = makeUser("tenant1", "Tran Thi Bich", "0912345678", "bich@gmail.com", Role.TENANT);
        User u2 = makeUser("tenant2", "Le Van Cuong", "0923456789", "cuong@gmail.com", Role.TENANT);
        User u3 = makeUser("tenant3", "Pham Thi Dung", "0934567890", "dung@gmail.com", Role.TENANT);
        User u4 = makeUser("tenant4", "Hoang Van Em", "0945678901", "em@gmail.com", Role.TENANT);
        User u5 = makeUser("tenant5", "Nguyen Thi Phuong", "0956789012", "phuong@gmail.com", Role.TENANT);

        // ============ BOARDING HOUSES ============
        BoardingHouse h1 = makeBoardingHouse("Nhà Trọ Ánh Dương", "123 Nguyễn Trãi, Q.1, TP.HCM", 4, "Gần ĐH Kinh Tế, đầy đủ tiện nghi");
        BoardingHouse h2 = makeBoardingHouse("Nhà Trọ Bình Minh", "456 Lê Văn Sỹ, Q.3, TP.HCM", 3, "Gần chợ, yên tĩnh, an ninh tốt");

        // ============ SERVICE TYPES ============
        ServiceType electricity = makeServiceType("Điện", ServiceCategory.ELECTRICITY, "kWh", "3500");
        ServiceType water = makeServiceType("Nước", ServiceCategory.WATER, "m³", "15000");
        ServiceType internet = makeServiceType("Internet", ServiceCategory.FIXED, "tháng", "150000");
        ServiceType parking = makeServiceType("Gửi xe máy", ServiceCategory.FIXED, "tháng", "100000");
        ServiceType cleaning = makeServiceType("Vệ sinh", ServiceCategory.FIXED, "tháng", "50000");

        // ============ ROOMS - House 1 ============
        Room r101 = makeRoom("A101", h1, 1, "20.0", "2500000", RoomStatus.OCCUPIED);
        Room r102 = makeRoom("A102", h1, 1, "22.0", "2800000", RoomStatus.OCCUPIED);
        Room r103 = makeRoom("A103", h1, 1, "18.0", "2200000", RoomStatus.AVAILABLE);
        Room r201 = makeRoom("A201", h1, 2, "25.0", "3000000", RoomStatus.OCCUPIED);
        Room r202 = makeRoom("A202", h1, 2, "25.0", "3000000", RoomStatus.AVAILABLE);
        Room r301 = makeRoom("A301", h1, 3, "30.0", "3500000", RoomStatus.OCCUPIED);

        // ============ ROOMS - House 2 ============
        Room r401 = makeRoom("B101", h2, 1, "20.0", "2300000", RoomStatus.OCCUPIED);
        Room r402 = makeRoom("B102", h2, 1, "20.0", "2300000", RoomStatus.AVAILABLE);
        Room r403 = makeRoom("B201", h2, 2, "24.0", "2700000", RoomStatus.OCCUPIED);

        // Assign services to rooms
        addRoomServices(r101, electricity, water, internet, parking);
        addRoomServices(r102, electricity, water, internet);
        addRoomServices(r201, electricity, water, internet, parking, cleaning);
        addRoomServices(r301, electricity, water, internet, parking);
        addRoomServices(r401, electricity, water, internet);
        addRoomServices(r403, electricity, water, internet, parking);

        // ============ TENANTS ============
        Tenant t1 = makeTenant(u1, "Trần Thị Bích", "0912345678", "bich@gmail.com", "012345678901", LocalDate.of(1998, 3, 20), "45 Trần Hưng Đạo, Q.5");
        Tenant t2 = makeTenant(u2, "Lê Văn Cường", "0923456789", "cuong@gmail.com", "023456789012", LocalDate.of(1996, 7, 15), "78 Đinh Tiên Hoàng, Q.Bình Thạnh");
        Tenant t3 = makeTenant(u3, "Phạm Thị Dung", "0934567890", "dung@gmail.com", "034567890123", LocalDate.of(2000, 1, 5), "12 Nguyễn Văn Cừ, Q.5");
        Tenant t4 = makeTenant(u4, "Hoàng Văn Em", "0945678901", "em@gmail.com", "045678901234", LocalDate.of(1995, 11, 30), "99 Lý Thường Kiệt, Q.10");
        Tenant t5 = makeTenant(u5, "Nguyễn Thị Phương", "0956789012", "phuong@gmail.com", "056789012345", LocalDate.of(1999, 6, 22), "33 Cách Mạng Tháng 8, Q.3");

        // ============ CONTRACTS ============
        // ct1: checkin hôm qua, checkout ngày mai → đang ở hôm nay
        Contract ct1 = makeContract("CT-2026-001", r101, t1, LocalDate.now().minusDays(1), LocalDate.now().plusDays(2), "250000", "500000");
        // ct2: checkin hôm nay, checkout 3 ngày sau
        Contract ct2 = makeContract("CT-2026-002", r102, t2, LocalDate.now(), LocalDate.now().plusDays(3), "280000", "560000");
        // ct3: checkin 3 ngày trước, checkout hôm nay
        Contract ct3 = makeContract("CT-2026-003", r201, t3, LocalDate.now().minusDays(3), LocalDate.now(), "300000", "600000");
        // ct4: checkin hôm nay, checkout ngày mai
        Contract ct4 = makeContract("CT-2026-004", r301, t4, LocalDate.now(), LocalDate.now().plusDays(1), "350000", "700000");
        // ct5: checkin hôm qua, checkout hôm nay
        Contract ct5 = makeContract("CT-2026-005", r401, t5, LocalDate.now().minusDays(1), LocalDate.now(), "230000", "460000");
        // ct6: checkin 2 ngày trước, checkout ngày mai → đang ở hôm nay
        Contract ct6 = makeContract("CT-2026-006", r403, t1, LocalDate.now().minusDays(2), LocalDate.now().plusDays(1), "270000", "540000");

        // ============ INVOICES ============
        // ct1 - 3 tháng, 2 đã trả đủ, 1 trả một phần
        Invoice inv1 = makeInvoice("INV-CT1-02-2026", ct1, r101, 2, 2026, "3200000", PaymentStatus.PAID);
        Invoice inv2 = makeInvoice("INV-CT1-03-2026", ct1, r101, 3, 2026, "3150000", PaymentStatus.PAID);
        Invoice inv3 = makeInvoice("INV-CT1-04-2026", ct1, r101, 4, 2026, "3300000", PaymentStatus.PARTIALLY_PAID);

        // ct2 - 2 tháng, 1 đã trả, 1 chưa trả
        Invoice inv4 = makeInvoice("INV-CT2-02-2026", ct2, r102, 2, 2026, "3050000", PaymentStatus.PAID);
        Invoice inv5 = makeInvoice("INV-CT2-03-2026", ct2, r102, 3, 2026, "2980000", PaymentStatus.UNPAID);

        // ct3 - nhiều tháng, có overdue
        Invoice inv6 = makeInvoice("INV-CT3-01-2026", ct3, r201, 1, 2026, "3400000", PaymentStatus.PAID);
        Invoice inv7 = makeInvoice("INV-CT3-02-2026", ct3, r201, 2, 2026, "3250000", PaymentStatus.OVERDUE);
        Invoice inv8 = makeInvoice("INV-CT3-03-2026", ct3, r201, 3, 2026, "3100000", PaymentStatus.PARTIALLY_PAID);

        // ct4 - mới, 1 hóa đơn chưa trả
        Invoice inv9 = makeInvoice("INV-CT4-04-2026", ct4, r301, 4, 2026, "3800000", PaymentStatus.UNPAID);

        // ct5
        Invoice inv10 = makeInvoice("INV-CT5-01-2026", ct5, r401, 1, 2026, "2550000", PaymentStatus.PAID);
        Invoice inv11 = makeInvoice("INV-CT5-02-2026", ct5, r401, 2, 2026, "2480000", PaymentStatus.PAID);
        Invoice inv12 = makeInvoice("INV-CT5-03-2026", ct5, r401, 3, 2026, "2600000", PaymentStatus.PARTIALLY_PAID);

        // ============ PAYMENTS ============
        addPayment(inv1, "3200000", PaymentMethod.BANK_TRANSFER, LocalDateTime.now().minusMonths(2), "TT tháng 2/2026");
        addPayment(inv2, "3150000", PaymentMethod.CASH, LocalDateTime.now().minusMonths(1), "TT tháng 3/2026");
        addPayment(inv3, "2000000", PaymentMethod.MOMO, LocalDateTime.now().minusDays(5), "Trả một phần tháng 4");

        addPayment(inv4, "3050000", PaymentMethod.BANK_TRANSFER, LocalDateTime.now().minusMonths(2), "TT đầy đủ");
        // inv5 chưa trả

        addPayment(inv6, "3400000", PaymentMethod.CASH, LocalDateTime.now().minusMonths(3), "TT tháng 1");
        // inv7 overdue - chưa trả
        addPayment(inv8, "1500000", PaymentMethod.CASH, LocalDateTime.now().minusDays(10), "Trả một phần");

        // inv9 chưa trả

        addPayment(inv10, "2550000", PaymentMethod.BANK_TRANSFER, LocalDateTime.now().minusMonths(3), "TT đầy đủ");
        addPayment(inv11, "2480000", PaymentMethod.BANK_TRANSFER, LocalDateTime.now().minusMonths(2), "TT đầy đủ");
        addPayment(inv12, "1000000", PaymentMethod.CASH, LocalDateTime.now().minusDays(3), "Trả trước 1 triệu");

        // ============ GUEST SERVICE CHARGES ============
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate twoDaysAgo = today.minusDays(2);

        // ct1 - Trần Thị Bích - phòng A101
        addCharge(ct1, r101, today, "Bia Saigon", new BigDecimal("3"), new BigDecimal("25000"), "3 lon bia");
        addCharge(ct1, r101, today, "Thuốc lá Thăng Long", new BigDecimal("1"), new BigDecimal("30000"), null);
        addCharge(ct1, r101, today, "Bữa ăn tối", new BigDecimal("2"), new BigDecimal("45000"), "2 suất cơm");
        addCharge(ct1, r101, yesterday, "Thuê xe máy", new BigDecimal("1"), new BigDecimal("150000"), "Thuê cả ngày");
        addCharge(ct1, r101, yesterday, "Nước suối", new BigDecimal("4"), new BigDecimal("10000"), null);
        addCharge(ct1, r101, yesterday, "Bữa ăn sáng", new BigDecimal("1"), new BigDecimal("35000"), "Phở bò");
        addCharge(ct1, r101, twoDaysAgo, "Bia Tiger", new BigDecimal("6"), new BigDecimal("28000"), "Nhậu nhóm");
        addCharge(ct1, r101, twoDaysAgo, "Mồi nhậu", new BigDecimal("2"), new BigDecimal("80000"), "Đồ nhắm");
        addCharge(ct1, r101, twoDaysAgo, "Nước ngọt Pepsi", new BigDecimal("3"), new BigDecimal("15000"), null);

        // ct4 - Hoàng Văn Em - phòng A301 (mới checkin)
        addCharge(ct4, r301, today, "Bia Heineken", new BigDecimal("4"), new BigDecimal("35000"), null);
        addCharge(ct4, r301, today, "Bữa ăn trưa", new BigDecimal("3"), new BigDecimal("50000"), "3 suất cơm");
        addCharge(ct4, r301, today, "Thuê xe đạp", new BigDecimal("1"), new BigDecimal("50000"), "Nửa ngày");
        addCharge(ct4, r301, yesterday, "Nước suối", new BigDecimal("6"), new BigDecimal("10000"), null);
        addCharge(ct4, r301, yesterday, "Snack các loại", new BigDecimal("5"), new BigDecimal("20000"), null);

        // ct5 - Nguyễn Thị Phương - phòng B101
        addCharge(ct5, r401, today, "Cà phê sáng", new BigDecimal("2"), new BigDecimal("25000"), null);
        addCharge(ct5, r401, yesterday, "Thuê xe máy", new BigDecimal("1"), new BigDecimal("120000"), "Nửa ngày");
        addCharge(ct5, r401, yesterday, "Bữa ăn tối", new BigDecimal("1"), new BigDecimal("55000"), null);
    }

    // ============ HELPERS ============
    private User makeUser(String username, String fullName, String phone, String email, Role role) {
        User u = new User();
        u.setUsername(username); u.setPassword(passwordEncoder.encode("tenant123"));
        u.setFullName(fullName); u.setEmail(email); u.setPhone(phone);
        Set<Role> roles = new HashSet<>(); roles.add(role);
        u.setRoles(roles); u.setActive(true);
        return userRepository.save(u);
    }

    private BoardingHouse makeBoardingHouse(String name, String address, int floors, String notes) {
        BoardingHouse h = new BoardingHouse();
        h.setName(name); h.setAddress(address); h.setNumberOfFloors(floors); h.setNotes(notes);
        return boardingHouseRepository.save(h);
    }

    private ServiceType makeServiceType(String name, ServiceCategory cat, String unit, String price) {
        ServiceType s = new ServiceType();
        s.setName(name); s.setCategory(cat); s.setUnit(unit);
        s.setPricePerUnit(new BigDecimal(price)); s.setIsActive(true);
        return serviceTypeRepository.save(s);
    }

    private Room makeRoom(String code, BoardingHouse house, int floor, String area, String rent, RoomStatus status) {
        Room r = new Room();
        r.setCode(code); r.setBoardingHouse(house); r.setFloor(floor);
        r.setArea(new BigDecimal(area)); r.setMaxOccupants(2);
        r.setBaseRent(new BigDecimal(rent)); r.setStatus(status);
        return roomRepository.save(r);
    }

    private void addRoomServices(Room room, ServiceType... types) {
        for (ServiceType st : types) {
            RoomService rs = new RoomService();
            rs.setRoom(room); rs.setServiceType(st);
            if (st.getCategory() == ServiceCategory.FIXED) rs.setFixedPrice(st.getPricePerUnit());
            else rs.setPricePerUnit(st.getPricePerUnit());
            roomServiceRepository.save(rs);
        }
    }

    private Tenant makeTenant(User user, String fullName, String phone, String email,
                               String idNum, LocalDate dob, String address) {
        Tenant t = new Tenant();
        t.setUser(user); t.setFullName(fullName); t.setPhone(phone); t.setEmail(email);
        t.setIdentityNumber(idNum); t.setDateOfBirth(dob); t.setPermanentAddress(address);
        t.setStatus(TenantStatus.ACTIVE);
        return tenantRepository.save(t);
    }

    private Contract makeContract(String code, Room room, Tenant tenant,
                                   LocalDate start, LocalDate end, String dailyRate, String deposit) {
        Contract c = new Contract();
        c.setCode(code); c.setRoom(room); c.setMainTenant(tenant);
        c.setStartDate(start); c.setEndDate(end);
        c.setDailyRate(new BigDecimal(dailyRate));
        c.setMonthlyRent(new BigDecimal(dailyRate).multiply(BigDecimal.valueOf(30)));
        c.setDeposit(new BigDecimal(deposit));
        c.setStatus(ContractStatus.ACTIVE); c.setBillingCycle(BillingCycle.MONTHLY);
        return contractRepository.save(c);
    }

    private Invoice makeInvoice(String code, Contract contract, Room room,
                                 int month, int year, String total, PaymentStatus status) {
        Invoice inv = new Invoice();
        inv.setCode(code); inv.setContract(contract); inv.setRoom(room);
        inv.setPeriodMonth(month); inv.setPeriodYear(year);
        inv.setTotalAmount(new BigDecimal(total)); inv.setStatus(status);
        inv.setDueDate(LocalDate.of(year, month, 28));
        inv.setCreatedDate(LocalDate.of(year, month, 1));
        return invoiceRepository.save(inv);
    }

    private void addPayment(Invoice invoice, String amount, PaymentMethod method,
                             LocalDateTime date, String note) {
        Payment p = new Payment();
        p.setInvoice(invoice); p.setPaidAmount(new BigDecimal(amount));
        p.setMethod(method); p.setPaymentDate(date); p.setNote(note);
        paymentRepository.save(p);
    }

    private void addCharge(Contract contract, Room room, LocalDate date,
                            String desc, BigDecimal qty, BigDecimal unitPrice, String note) {
        GuestServiceCharge c = new GuestServiceCharge();
        c.setContract(contract); c.setRoom(room); c.setChargeDate(date);
        c.setDescription(desc); c.setQuantity(qty); c.setUnitPrice(unitPrice);
        c.setAmount(qty.multiply(unitPrice)); c.setNote(note);
        guestServiceChargeRepository.save(c);
    }
}

