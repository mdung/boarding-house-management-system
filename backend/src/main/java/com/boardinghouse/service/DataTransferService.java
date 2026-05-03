package com.boardinghouse.service;

import com.boardinghouse.dto.DataExportDto;
import com.boardinghouse.entity.*;
import com.boardinghouse.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DataTransferService {

    private final UserRepository userRepo;
    private final BoardingHouseRepository boardingHouseRepo;
    private final RoomRepository roomRepo;
    private final TenantRepository tenantRepo;
    private final ServiceTypeRepository serviceTypeRepo;
    private final RoomServiceRepository roomServiceRepo;
    private final ServiceCatalogRepository serviceCatalogRepo;
    private final InventoryItemRepository inventoryItemRepo;
    private final InventoryTransactionRepository inventoryTransactionRepo;
    private final ContractRepository contractRepo;
    private final InvoiceRepository invoiceRepo;
    private final InvoiceItemRepository invoiceItemRepo;
    private final PaymentRepository paymentRepo;
    private final GuestServiceChargeRepository guestServiceChargeRepo;
    private final JdbcTemplate jdbcTemplate;

    public DataTransferService(
            UserRepository userRepo,
            BoardingHouseRepository boardingHouseRepo,
            RoomRepository roomRepo,
            TenantRepository tenantRepo,
            ServiceTypeRepository serviceTypeRepo,
            RoomServiceRepository roomServiceRepo,
            ServiceCatalogRepository serviceCatalogRepo,
            InventoryItemRepository inventoryItemRepo,
            InventoryTransactionRepository inventoryTransactionRepo,
            ContractRepository contractRepo,
            InvoiceRepository invoiceRepo,
            InvoiceItemRepository invoiceItemRepo,
            PaymentRepository paymentRepo,
            GuestServiceChargeRepository guestServiceChargeRepo,
            JdbcTemplate jdbcTemplate) {
        this.userRepo = userRepo;
        this.boardingHouseRepo = boardingHouseRepo;
        this.roomRepo = roomRepo;
        this.tenantRepo = tenantRepo;
        this.serviceTypeRepo = serviceTypeRepo;
        this.roomServiceRepo = roomServiceRepo;
        this.serviceCatalogRepo = serviceCatalogRepo;
        this.inventoryItemRepo = inventoryItemRepo;
        this.inventoryTransactionRepo = inventoryTransactionRepo;
        this.contractRepo = contractRepo;
        this.invoiceRepo = invoiceRepo;
        this.invoiceItemRepo = invoiceItemRepo;
        this.paymentRepo = paymentRepo;
        this.guestServiceChargeRepo = guestServiceChargeRepo;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ─── EXPORT ──────────────────────────────────────────────────────────────

    public DataExportDto exportAll(String exportedBy) {
        DataExportDto dto = new DataExportDto();
        dto.setExportVersion("1.0");
        dto.setExportedAt(LocalDateTime.now());
        dto.setExportedBy(exportedBy);

        dto.setUsers(exportUsers());
        dto.setBoardingHouses(exportBoardingHouses());
        dto.setRooms(exportRooms());
        dto.setTenants(exportTenants());
        dto.setServiceTypes(exportServiceTypes());
        dto.setRoomServices(exportRoomServices());
        dto.setServiceCatalog(exportServiceCatalog());
        dto.setInventoryItems(exportInventoryItems());
        dto.setInventoryTransactions(exportInventoryTransactions());
        dto.setContracts(exportContracts());
        dto.setContractTenants(exportContractTenants());
        dto.setInvoices(exportInvoices());
        dto.setInvoiceItems(exportInvoiceItems());
        dto.setPayments(exportPayments());
        dto.setGuestServiceCharges(exportGuestServiceCharges());

        return dto;
    }

    private List<DataExportDto.UserExport> exportUsers() {
        return userRepo.findAll().stream().map(u -> {
            Set<String> roles = u.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
            return new DataExportDto.UserExport(
                    u.getId(), u.getUsername(), u.getPassword(),
                    u.getFullName(), u.getPhone(), u.getEmail(),
                    roles, u.getPermissions(), u.getActive(), u.getProfilePicture()
            );
        }).collect(Collectors.toList());
    }

    private List<DataExportDto.BoardingHouseExport> exportBoardingHouses() {
        return boardingHouseRepo.findAll().stream().map(b ->
                new DataExportDto.BoardingHouseExport(
                        b.getId(), b.getName(), b.getAddress(),
                        b.getDescription(), b.getNumberOfFloors(), b.getNotes()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.RoomExport> exportRooms() {
        return roomRepo.findAll().stream().map(r ->
                new DataExportDto.RoomExport(
                        r.getId(), r.getCode(),
                        r.getBoardingHouse().getId(),
                        r.getFloor(), r.getArea(), r.getMaxOccupants(),
                        r.getBaseRent(), r.getStatus().name()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.TenantExport> exportTenants() {
        return tenantRepo.findAll().stream().map(t ->
                new DataExportDto.TenantExport(
                        t.getId(),
                        t.getUser() != null ? t.getUser().getId() : null,
                        t.getFullName(), t.getPhone(), t.getEmail(),
                        t.getIdentityNumber(), t.getDateOfBirth(),
                        t.getPermanentAddress(), t.getStatus().name()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.ServiceTypeExport> exportServiceTypes() {
        return serviceTypeRepo.findAll().stream().map(s ->
                new DataExportDto.ServiceTypeExport(
                        s.getId(), s.getName(), s.getCategory().name(),
                        s.getUnit(), s.getPricePerUnit(), s.getIsActive()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.RoomServiceExport> exportRoomServices() {
        return roomServiceRepo.findAll().stream().map(rs ->
                new DataExportDto.RoomServiceExport(
                        rs.getId(),
                        rs.getRoom().getId(),
                        rs.getServiceType().getId(),
                        rs.getPricePerUnit(),
                        rs.getFixedPrice()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.ServiceCatalogExport> exportServiceCatalog() {
        return serviceCatalogRepo.findAll().stream().map(sc ->
                new DataExportDto.ServiceCatalogExport(
                        sc.getId(), sc.getName(), sc.getCategory(),
                        sc.getUnit(), sc.getDefaultPrice(), sc.getIcon(),
                        sc.getInventoryItem() != null ? sc.getInventoryItem().getId() : null,
                        sc.getIsActive(), sc.getSortOrder()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.InventoryItemExport> exportInventoryItems() {
        return inventoryItemRepo.findAll().stream().map(i ->
                new DataExportDto.InventoryItemExport(
                        i.getId(), i.getSku(), i.getName(), i.getCategory(),
                        i.getUnit(), i.getPurchasePrice(), i.getSalePrice(),
                        i.getQuantityOnHand(), i.getReorderLevel(),
                        i.getIsActive(), i.getNote(), i.getCreatedDate()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.InventoryTransactionExport> exportInventoryTransactions() {
        return inventoryTransactionRepo.findAll().stream().map(t ->
                new DataExportDto.InventoryTransactionExport(
                        t.getId(), t.getItem().getId(), t.getType().name(),
                        t.getQuantity(), t.getUnitPrice(), t.getAmount(),
                        t.getReference(), t.getNote(), t.getCreatedDate()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.ContractExport> exportContracts() {
        return contractRepo.findAll().stream().map(c ->
                new DataExportDto.ContractExport(
                        c.getId(), c.getCode(),
                        c.getRoom().getId(),
                        c.getMainTenant().getId(),
                        c.getStartDate(), c.getEndDate(),
                        c.getDeposit(), c.getMonthlyRent(), c.getDailyRate(),
                        c.getStatus().name(), c.getBillingCycle().name(),
                        c.getTerminationReason(), c.getTerminationDate(),
                        c.getRoomReleased()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.ContractTenantExport> exportContractTenants() {
        List<DataExportDto.ContractTenantExport> result = new ArrayList<>();
        contractRepo.findAll().forEach(c ->
                c.getTenants().forEach(t ->
                        result.add(new DataExportDto.ContractTenantExport(c.getId(), t.getId()))
                )
        );
        return result;
    }

    private List<DataExportDto.InvoiceExport> exportInvoices() {
        return invoiceRepo.findAll().stream().map(i ->
                new DataExportDto.InvoiceExport(
                        i.getId(), i.getCode(),
                        i.getContract().getId(),
                        i.getRoom().getId(),
                        i.getPeriodMonth(), i.getPeriodYear(),
                        i.getTotalAmount(), i.getStatus().name(),
                        i.getDueDate(), i.getCreatedDate()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.InvoiceItemExport> exportInvoiceItems() {
        return invoiceItemRepo.findAll().stream().map(ii ->
                new DataExportDto.InvoiceItemExport(
                        ii.getId(), ii.getInvoice().getId(),
                        ii.getDescription(), ii.getType().name(),
                        ii.getQuantity(), ii.getUnitPrice(), ii.getAmount(),
                        ii.getOldIndex(), ii.getNewIndex()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.PaymentExport> exportPayments() {
        return paymentRepo.findAll().stream().map(p ->
                new DataExportDto.PaymentExport(
                        p.getId(), p.getInvoice().getId(),
                        p.getPaidAmount(), p.getPaymentDate(),
                        p.getMethod().name(), p.getNote(), p.getTransactionCode()
                )
        ).collect(Collectors.toList());
    }

    private List<DataExportDto.GuestServiceChargeExport> exportGuestServiceCharges() {
        return guestServiceChargeRepo.findAll().stream().map(g ->
                new DataExportDto.GuestServiceChargeExport(
                        g.getId(),
                        g.getContract().getId(),
                        g.getRoom().getId(),
                        g.getChargeDate(),
                        g.getInventoryItem() != null ? g.getInventoryItem().getId() : null,
                        g.getDescription(),
                        g.getQuantity(), g.getUnitPrice(), g.getAmount(),
                        g.getNote(), g.getCreatedDate()
                )
        ).collect(Collectors.toList());
    }

    // ─── IMPORT ──────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> importAll(DataExportDto data) {
        Map<String, Object> stats = new LinkedHashMap<>();

        // Xóa toàn bộ data cũ theo thứ tự phụ thuộc (FK)
        clearAllData();

        // Import theo thứ tự phụ thuộc
        int users = importUsers(data.getUsers());
        stats.put("users", users);

        int boardingHouses = importBoardingHouses(data.getBoardingHouses());
        stats.put("boardingHouses", boardingHouses);

        int rooms = importRooms(data.getRooms());
        stats.put("rooms", rooms);

        int tenants = importTenants(data.getTenants());
        stats.put("tenants", tenants);

        int serviceTypes = importServiceTypes(data.getServiceTypes());
        stats.put("serviceTypes", serviceTypes);

        int roomServices = importRoomServices(data.getRoomServices());
        stats.put("roomServices", roomServices);

        int inventoryItems = importInventoryItems(data.getInventoryItems());
        stats.put("inventoryItems", inventoryItems);

        int inventoryTransactions = importInventoryTransactions(data.getInventoryTransactions());
        stats.put("inventoryTransactions", inventoryTransactions);

        int serviceCatalog = importServiceCatalog(data.getServiceCatalog());
        stats.put("serviceCatalog", serviceCatalog);

        int contracts = importContracts(data.getContracts());
        stats.put("contracts", contracts);

        importContractTenants(data.getContractTenants());

        int invoices = importInvoices(data.getInvoices());
        stats.put("invoices", invoices);

        int invoiceItems = importInvoiceItems(data.getInvoiceItems());
        stats.put("invoiceItems", invoiceItems);

        int payments = importPayments(data.getPayments());
        stats.put("payments", payments);

        int guestCharges = importGuestServiceCharges(data.getGuestServiceCharges());
        stats.put("guestServiceCharges", guestCharges);

        return stats;
    }

    private void clearAllData() {
        // Xóa theo thứ tự FK ngược lại
        jdbcTemplate.execute("DELETE FROM audit_logs");
        jdbcTemplate.execute("DELETE FROM payments");
        jdbcTemplate.execute("DELETE FROM invoice_items");
        jdbcTemplate.execute("DELETE FROM invoices");
        jdbcTemplate.execute("DELETE FROM guest_service_charges");
        jdbcTemplate.execute("DELETE FROM contract_tenants");
        jdbcTemplate.execute("DELETE FROM contracts");
        jdbcTemplate.execute("DELETE FROM room_services");
        jdbcTemplate.execute("DELETE FROM service_catalog");
        jdbcTemplate.execute("DELETE FROM inventory_transactions");
        jdbcTemplate.execute("DELETE FROM inventory_items");
        jdbcTemplate.execute("DELETE FROM service_types");
        jdbcTemplate.execute("DELETE FROM tenants");
        jdbcTemplate.execute("DELETE FROM rooms");
        jdbcTemplate.execute("DELETE FROM boarding_houses");
        jdbcTemplate.execute("DELETE FROM user_permissions");
        jdbcTemplate.execute("DELETE FROM user_roles");
        jdbcTemplate.execute("DELETE FROM users");
    }

    private int importUsers(List<DataExportDto.UserExport> list) {
        if (list == null) return 0;
        for (DataExportDto.UserExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO users (id, username, password, full_name, phone, email, active, profile_picture) VALUES (?,?,?,?,?,?,?,?)",
                e.getId(), e.getUsername(), e.getPassword(),
                e.getFullName(), e.getPhone(), e.getEmail(),
                e.getActive(), e.getProfilePicture()
            );
            if (e.getRoles() != null) {
                for (String role : e.getRoles()) {
                    jdbcTemplate.update("INSERT INTO user_roles (user_id, role) VALUES (?,?)", e.getId(), role);
                }
            }
            if (e.getPermissions() != null) {
                for (String perm : e.getPermissions()) {
                    jdbcTemplate.update("INSERT INTO user_permissions (user_id, permission) VALUES (?,?)", e.getId(), perm);
                }
            }
        }
        resetSequence("users", list.stream().mapToLong(DataExportDto.UserExport::getId).max().orElse(0));
        return list.size();
    }

    private int importBoardingHouses(List<DataExportDto.BoardingHouseExport> list) {
        if (list == null) return 0;
        for (DataExportDto.BoardingHouseExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO boarding_houses (id, name, address, description, number_of_floors, notes) VALUES (?,?,?,?,?,?)",
                e.getId(), e.getName(), e.getAddress(),
                e.getDescription(), e.getNumberOfFloors(), e.getNotes()
            );
        }
        resetSequence("boarding_houses", list.stream().mapToLong(DataExportDto.BoardingHouseExport::getId).max().orElse(0));
        return list.size();
    }

    private int importRooms(List<DataExportDto.RoomExport> list) {
        if (list == null) return 0;
        for (DataExportDto.RoomExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO rooms (id, code, boarding_house_id, floor, area, max_occupants, base_rent, status) VALUES (?,?,?,?,?,?,?,?)",
                e.getId(), e.getCode(), e.getBoardingHouseId(),
                e.getFloor(), e.getArea(), e.getMaxOccupants(),
                e.getBaseRent(), e.getStatus()
            );
        }
        resetSequence("rooms", list.stream().mapToLong(DataExportDto.RoomExport::getId).max().orElse(0));
        return list.size();
    }

    private int importTenants(List<DataExportDto.TenantExport> list) {
        if (list == null) return 0;
        for (DataExportDto.TenantExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO tenants (id, user_id, full_name, phone, email, identity_number, date_of_birth, permanent_address, status) VALUES (?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getUserId(), e.getFullName(), e.getPhone(), e.getEmail(),
                e.getIdentityNumber(), e.getDateOfBirth(),
                e.getPermanentAddress(), e.getStatus()
            );
        }
        resetSequence("tenants", list.stream().mapToLong(DataExportDto.TenantExport::getId).max().orElse(0));
        return list.size();
    }

    private int importServiceTypes(List<DataExportDto.ServiceTypeExport> list) {
        if (list == null) return 0;
        for (DataExportDto.ServiceTypeExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO service_types (id, name, category, unit, price_per_unit, is_active) VALUES (?,?,?,?,?,?)",
                e.getId(), e.getName(), e.getCategory(),
                e.getUnit(), e.getPricePerUnit(), e.getIsActive()
            );
        }
        resetSequence("service_types", list.stream().mapToLong(DataExportDto.ServiceTypeExport::getId).max().orElse(0));
        return list.size();
    }

    private int importRoomServices(List<DataExportDto.RoomServiceExport> list) {
        if (list == null) return 0;
        for (DataExportDto.RoomServiceExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO room_services (id, room_id, service_type_id, price_per_unit, fixed_price) VALUES (?,?,?,?,?)",
                e.getId(), e.getRoomId(), e.getServiceTypeId(),
                e.getPricePerUnit(), e.getFixedPrice()
            );
        }
        resetSequence("room_services", list.stream().mapToLong(DataExportDto.RoomServiceExport::getId).max().orElse(0));
        return list.size();
    }

    private int importInventoryItems(List<DataExportDto.InventoryItemExport> list) {
        if (list == null) return 0;
        for (DataExportDto.InventoryItemExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO inventory_items (id, sku, name, category, unit, purchase_price, sale_price, quantity_on_hand, reorder_level, is_active, note, created_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getSku(), e.getName(), e.getCategory(), e.getUnit(),
                e.getPurchasePrice(), e.getSalePrice(), e.getQuantityOnHand(),
                e.getReorderLevel(), e.getIsActive(), e.getNote(), e.getCreatedDate()
            );
        }
        resetSequence("inventory_items", list.stream().mapToLong(DataExportDto.InventoryItemExport::getId).max().orElse(0));
        return list.size();
    }

    private int importInventoryTransactions(List<DataExportDto.InventoryTransactionExport> list) {
        if (list == null) return 0;
        for (DataExportDto.InventoryTransactionExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO inventory_transactions (id, item_id, type, quantity, unit_price, amount, reference, note, created_date) VALUES (?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getItemId(), e.getType(),
                e.getQuantity(), e.getUnitPrice(), e.getAmount(),
                e.getReference(), e.getNote(), e.getCreatedDate()
            );
        }
        resetSequence("inventory_transactions", list.stream().mapToLong(DataExportDto.InventoryTransactionExport::getId).max().orElse(0));
        return list.size();
    }

    private int importServiceCatalog(List<DataExportDto.ServiceCatalogExport> list) {
        if (list == null) return 0;
        for (DataExportDto.ServiceCatalogExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO service_catalog (id, name, category, unit, default_price, icon, inventory_item_id, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getName(), e.getCategory(), e.getUnit(),
                e.getDefaultPrice(), e.getIcon(), e.getInventoryItemId(),
                e.getIsActive(), e.getSortOrder()
            );
        }
        resetSequence("service_catalog", list.stream().mapToLong(DataExportDto.ServiceCatalogExport::getId).max().orElse(0));
        return list.size();
    }

    private int importContracts(List<DataExportDto.ContractExport> list) {
        if (list == null) return 0;
        for (DataExportDto.ContractExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO contracts (id, code, room_id, main_tenant_id, start_date, end_date, deposit, monthly_rent, daily_rate, status, billing_cycle, termination_reason, termination_date, room_released) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getCode(), e.getRoomId(), e.getMainTenantId(),
                e.getStartDate(), e.getEndDate(), e.getDeposit(),
                e.getMonthlyRent(), e.getDailyRate(), e.getStatus(),
                e.getBillingCycle(), e.getTerminationReason(),
                e.getTerminationDate(), e.getRoomReleased()
            );
        }
        resetSequence("contracts", list.stream().mapToLong(DataExportDto.ContractExport::getId).max().orElse(0));
        return list.size();
    }

    private void importContractTenants(List<DataExportDto.ContractTenantExport> list) {
        if (list == null) return;
        for (DataExportDto.ContractTenantExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO contract_tenants (contract_id, tenant_id) VALUES (?,?)",
                e.getContractId(), e.getTenantId()
            );
        }
    }

    private int importInvoices(List<DataExportDto.InvoiceExport> list) {
        if (list == null) return 0;
        for (DataExportDto.InvoiceExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO invoices (id, code, contract_id, room_id, period_month, period_year, total_amount, status, due_date, created_date) VALUES (?,?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getCode(), e.getContractId(), e.getRoomId(),
                e.getPeriodMonth(), e.getPeriodYear(), e.getTotalAmount(),
                e.getStatus(), e.getDueDate(), e.getCreatedDate()
            );
        }
        resetSequence("invoices", list.stream().mapToLong(DataExportDto.InvoiceExport::getId).max().orElse(0));
        return list.size();
    }

    private int importInvoiceItems(List<DataExportDto.InvoiceItemExport> list) {
        if (list == null) return 0;
        for (DataExportDto.InvoiceItemExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO invoice_items (id, invoice_id, description, type, quantity, unit_price, amount, old_index, new_index) VALUES (?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getInvoiceId(), e.getDescription(), e.getType(),
                e.getQuantity(), e.getUnitPrice(), e.getAmount(),
                e.getOldIndex(), e.getNewIndex()
            );
        }
        resetSequence("invoice_items", list.stream().mapToLong(DataExportDto.InvoiceItemExport::getId).max().orElse(0));
        return list.size();
    }

    private int importPayments(List<DataExportDto.PaymentExport> list) {
        if (list == null) return 0;
        for (DataExportDto.PaymentExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO payments (id, invoice_id, paid_amount, payment_date, method, note, transaction_code) VALUES (?,?,?,?,?,?,?)",
                e.getId(), e.getInvoiceId(), e.getPaidAmount(),
                e.getPaymentDate(), e.getMethod(), e.getNote(), e.getTransactionCode()
            );
        }
        resetSequence("payments", list.stream().mapToLong(DataExportDto.PaymentExport::getId).max().orElse(0));
        return list.size();
    }

    private int importGuestServiceCharges(List<DataExportDto.GuestServiceChargeExport> list) {
        if (list == null) return 0;
        for (DataExportDto.GuestServiceChargeExport e : list) {
            jdbcTemplate.update(
                "INSERT INTO guest_service_charges (id, contract_id, room_id, charge_date, inventory_item_id, description, quantity, unit_price, amount, note, created_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                e.getId(), e.getContractId(), e.getRoomId(), e.getChargeDate(),
                e.getInventoryItemId(), e.getDescription(),
                e.getQuantity(), e.getUnitPrice(), e.getAmount(),
                e.getNote(), e.getCreatedDate()
            );
        }
        resetSequence("guest_service_charges", list.stream().mapToLong(DataExportDto.GuestServiceChargeExport::getId).max().orElse(0));
        return list.size();
    }

    /**
     * Reset PostgreSQL sequence sau khi insert với ID cụ thể,
     * để auto-increment tiếp tục đúng.
     */
    private void resetSequence(String tableName, long maxId) {
        if (maxId > 0) {
            jdbcTemplate.execute(
                "SELECT setval(pg_get_serial_sequence('" + tableName + "', 'id'), " + maxId + ", true)"
            );
        }
    }
}
