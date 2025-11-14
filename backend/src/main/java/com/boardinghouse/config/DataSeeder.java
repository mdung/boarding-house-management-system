package com.boardinghouse.config;

import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder,
                     BoardingHouseRepository boardingHouseRepository, RoomRepository roomRepository,
                     TenantRepository tenantRepository, ContractRepository contractRepository,
                     ServiceTypeRepository serviceTypeRepository, RoomServiceRepository roomServiceRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.boardingHouseRepository = boardingHouseRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
        this.contractRepository = contractRepository;
        this.serviceTypeRepository = serviceTypeRepository;
        this.roomServiceRepository = roomServiceRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedData();
        }
    }

    private void seedData() {
        // Create Admin User
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("Admin User");
        admin.setEmail("admin@example.com");
        admin.setPhone("0123456789");
        Set<Role> adminRoles = new HashSet<>();
        adminRoles.add(Role.ADMIN);
        admin.setRoles(adminRoles);
        admin.setActive(true);
        admin = userRepository.save(admin);

        // Create Tenant User
        User tenantUser = new User();
        tenantUser.setUsername("tenant");
        tenantUser.setPassword(passwordEncoder.encode("tenant123"));
        tenantUser.setFullName("Tenant User");
        tenantUser.setEmail("tenant@example.com");
        tenantUser.setPhone("0987654321");
        Set<Role> tenantRoles = new HashSet<>();
        tenantRoles.add(Role.TENANT);
        tenantUser.setRoles(tenantRoles);
        tenantUser.setActive(true);
        tenantUser = userRepository.save(tenantUser);

        // Create Boarding House
        BoardingHouse house = new BoardingHouse();
        house.setName("Sunshine Boarding House");
        house.setAddress("123 Main Street, District 1, Ho Chi Minh City");
        house.setDescription("A modern boarding house with full amenities");
        house.setNumberOfFloors(3);
        house.setNotes("Near university and shopping center");
        house = boardingHouseRepository.save(house);

        // Create Rooms
        Room room1 = new Room();
        room1.setCode("R101");
        room1.setBoardingHouse(house);
        room1.setFloor(1);
        room1.setArea(new BigDecimal("25.5"));
        room1.setMaxOccupants(2);
        room1.setBaseRent(new BigDecimal("3000000"));
        room1.setStatus(RoomStatus.AVAILABLE);
        room1 = roomRepository.save(room1);

        Room room2 = new Room();
        room2.setCode("R102");
        room2.setBoardingHouse(house);
        room2.setFloor(1);
        room2.setArea(new BigDecimal("30.0"));
        room2.setMaxOccupants(2);
        room2.setBaseRent(new BigDecimal("3500000"));
        room2.setStatus(RoomStatus.AVAILABLE);
        room2 = roomRepository.save(room2);

        Room room3 = new Room();
        room3.setCode("R201");
        room3.setBoardingHouse(house);
        room3.setFloor(2);
        room3.setArea(new BigDecimal("28.0"));
        room3.setMaxOccupants(2);
        room3.setBaseRent(new BigDecimal("3200000"));
        room3.setStatus(RoomStatus.AVAILABLE);
        room3 = roomRepository.save(room3);

        // Create Tenant
        Tenant tenant = new Tenant();
        tenant.setUser(tenantUser);
        tenant.setFullName("Nguyen Van A");
        tenant.setPhone("0987654321");
        tenant.setEmail("tenant@example.com");
        tenant.setIdentityNumber("001234567890");
        tenant.setDateOfBirth(LocalDate.of(1995, 5, 15));
        tenant.setPermanentAddress("456 Other Street, District 2");
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant = tenantRepository.save(tenant);

        // Create Service Types
        ServiceType electricity = new ServiceType();
        electricity.setName("Electricity");
        electricity.setCategory(ServiceCategory.ELECTRICITY);
        electricity.setUnit("kWh");
        electricity.setPricePerUnit(new BigDecimal("3000"));
        electricity.setIsActive(true);
        electricity = serviceTypeRepository.save(electricity);

        ServiceType water = new ServiceType();
        water.setName("Water");
        water.setCategory(ServiceCategory.WATER);
        water.setUnit("m³");
        water.setPricePerUnit(new BigDecimal("15000"));
        water.setIsActive(true);
        water = serviceTypeRepository.save(water);

        ServiceType internet = new ServiceType();
        internet.setName("Internet");
        internet.setCategory(ServiceCategory.FIXED);
        internet.setUnit("month");
        internet.setPricePerUnit(new BigDecimal("200000"));
        internet.setIsActive(true);
        internet = serviceTypeRepository.save(internet);

        // Assign services to rooms
        RoomService rs1 = new RoomService();
        rs1.setRoom(room1);
        rs1.setServiceType(electricity);
        rs1.setPricePerUnit(new BigDecimal("3000"));
        roomServiceRepository.save(rs1);

        RoomService rs2 = new RoomService();
        rs2.setRoom(room1);
        rs2.setServiceType(water);
        rs2.setPricePerUnit(new BigDecimal("15000"));
        roomServiceRepository.save(rs2);

        RoomService rs3 = new RoomService();
        rs3.setRoom(room1);
        rs3.setServiceType(internet);
        rs3.setFixedPrice(new BigDecimal("200000"));
        roomServiceRepository.save(rs3);

        // Create Contract
        Contract contract = new Contract();
        contract.setCode("CT-2024-001");
        contract.setRoom(room1);
        contract.setMainTenant(tenant);
        contract.setStartDate(LocalDate.now().minusMonths(2));
        contract.setEndDate(LocalDate.now().plusMonths(10));
        contract.setDeposit(new BigDecimal("6000000"));
        contract.setMonthlyRent(new BigDecimal("3000000"));
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setBillingCycle(BillingCycle.MONTHLY);
        contract = contractRepository.save(contract);

        // Update room status
        room1.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room1);
    }
}

