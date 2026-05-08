package com.boardinghouse.dto;

import com.boardinghouse.entity.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * DTO chứa toàn bộ data để export/import giữa các máy.
 * Không chứa cấu trúc bảng, chỉ chứa data thuần.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataExportDto {

    private String exportVersion = "1.0";
    private LocalDateTime exportedAt;
    private String exportedBy;

    private List<UserExport> users;
    private List<BoardingHouseExport> boardingHouses;
    private List<RoomExport> rooms;
    private List<TenantExport> tenants;
    private List<ServiceTypeExport> serviceTypes;
    private List<RoomServiceExport> roomServices;
    private List<ServiceCatalogExport> serviceCatalog;
    private List<InventoryItemExport> inventoryItems;
    private List<InventoryTransactionExport> inventoryTransactions;
    private List<ContractExport> contracts;
    private List<ContractTenantExport> contractTenants;
    private List<InvoiceExport> invoices;
    private List<InvoiceItemExport> invoiceItems;
    private List<PaymentExport> payments;
    private List<GuestServiceChargeExport> guestServiceCharges;
    private List<MonthlyExpenseExport> monthlyExpenses;
    private List<HousekeepingTaskExport> housekeepingTasks;
    private List<ServiceCatalogRecipeExport> serviceCatalogRecipes;

    // ─── Nested export classes ───────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UserExport {
        private Long id;
        private String username;
        private String password; // hashed
        private String fullName;
        private String phone;
        private String email;
        private Set<String> roles;
        private Set<String> permissions;
        private Boolean active;
        private String profilePicture;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class BoardingHouseExport {
        private Long id;
        private String name;
        private String address;
        private String description;
        private Integer numberOfFloors;
        private String notes;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomExport {
        private Long id;
        private String code;
        private Long boardingHouseId;
        private Integer floor;
        private BigDecimal area;
        private Integer maxOccupants;
        private BigDecimal baseRent;
        private String status;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class TenantExport {
        private Long id;
        private Long userId;
        private String fullName;
        private String phone;
        private String email;
        private String identityNumber;
        private String passportNumber;
        private LocalDate dateOfBirth;
        private String permanentAddress;
        private String status;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ServiceTypeExport {
        private Long id;
        private String name;
        private String category;
        private String unit;
        private BigDecimal pricePerUnit;
        private Boolean isActive;
        private Long boardingHouseId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomServiceExport {
        private Long id;
        private Long roomId;
        private Long serviceTypeId;
        private BigDecimal pricePerUnit;
        private BigDecimal fixedPrice;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ServiceCatalogExport {
        private Long id;
        private String name;
        private String category;
        private String unit;
        private BigDecimal defaultPrice;
        private String icon;
        private Long inventoryItemId;
        private Boolean isActive;
        private Integer sortOrder;
        private Long boardingHouseId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InventoryItemExport {
        private Long id;
        private String sku;
        private String name;
        private String category;
        private String unit;
        private BigDecimal purchasePrice;
        private BigDecimal salePrice;
        private BigDecimal quantityOnHand;
        private BigDecimal reorderLevel;
        private Boolean isActive;
        private String note;
        private LocalDate createdDate;
        private Long boardingHouseId;
        private String itemGroup;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InventoryTransactionExport {
        private Long id;
        private Long itemId;
        private String type;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
        private String reference;
        private String note;
        private LocalDate createdDate;
        private Long reversedByTransactionId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ContractExport {
        private Long id;
        private String code;
        private Long roomId;
        private Long mainTenantId;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal deposit;
        private BigDecimal monthlyRent;
        private BigDecimal dailyRate;
        private String status;
        private String billingCycle;
        private String terminationReason;
        private LocalDate terminationDate;
        private Boolean roomReleased;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ContractTenantExport {
        private Long contractId;
        private Long tenantId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InvoiceExport {
        private Long id;
        private String code;
        private Long contractId;
        private Long roomId;
        private Integer periodMonth;
        private Integer periodYear;
        private BigDecimal totalAmount;
        private String status;
        private LocalDate dueDate;
        private LocalDate createdDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InvoiceItemExport {
        private Long id;
        private Long invoiceId;
        private String description;
        private String type;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
        private BigDecimal oldIndex;
        private BigDecimal newIndex;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PaymentExport {
        private Long id;
        private Long invoiceId;
        private BigDecimal paidAmount;
        private LocalDateTime paymentDate;
        private String method;
        private String note;
        private String transactionCode;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GuestServiceChargeExport {
        private Long id;
        private Long contractId;
        private Long roomId;
        private LocalDate chargeDate;
        private Long inventoryItemId;
        private String description;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
        private String note;
        private LocalDate createdDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class MonthlyExpenseExport {
        private Long id;
        private Long boardingHouseId;
        private Integer month;
        private Integer year;
        private String category;
        private String description;
        private BigDecimal amount;
        private String note;
        private LocalDate createdDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class HousekeepingTaskExport {
        private Long id;
        private Long roomId;
        private Long contractId;
        private Long assignedToUserId;
        private String title;
        private String notes;
        private String status;
        private String priority;
        private LocalDate scheduledDate;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt;
        private Boolean autoGenerated;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ServiceCatalogRecipeExport {
        private Long id;
        private Long catalogId;
        private Long inventoryItemId;
        private BigDecimal quantityPerUnit;
    }
}
