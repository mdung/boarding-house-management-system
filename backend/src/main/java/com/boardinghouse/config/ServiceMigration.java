package com.boardinghouse.config;

import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.entity.ServiceCatalog;
import com.boardinghouse.entity.ServiceType;
import com.boardinghouse.repository.BoardingHouseRepository;
import com.boardinghouse.repository.ServiceCatalogRepository;
import com.boardinghouse.repository.ServiceTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time idempotent migration.
 *
 * Production data was seeded with "global" service types and catalog items
 * (boardingHouseId = NULL). These are conceptually owned by the first boarding
 * house.  This migration assigns them to the boarding house with the smallest
 * ID so that the per-house isolation logic works correctly:
 *
 *   - House 1  → sees its own services (previously global, now assigned)
 *   - House 2+ → sees only services explicitly added to them (empty until admin adds)
 *
 * Safe to run on every startup — it only acts when unassigned (global) records
 * still exist, so it is a no-op after the first successful run.
 */
@Component
@Order(2) // Run AFTER DataSeeder (Order 1 by default)
public class ServiceMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ServiceMigration.class);

    private final ServiceTypeRepository serviceTypeRepository;
    private final ServiceCatalogRepository serviceCatalogRepository;
    private final BoardingHouseRepository boardingHouseRepository;

    public ServiceMigration(ServiceTypeRepository serviceTypeRepository,
                            ServiceCatalogRepository serviceCatalogRepository,
                            BoardingHouseRepository boardingHouseRepository) {
        this.serviceTypeRepository = serviceTypeRepository;
        this.serviceCatalogRepository = serviceCatalogRepository;
        this.boardingHouseRepository = boardingHouseRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        migrateGlobalServiceTypes();
        migrateGlobalServiceCatalog();
    }

    private void migrateGlobalServiceTypes() {
        // Find all service types that have no boarding house assigned (global/legacy)
        List<ServiceType> globalTypes = serviceTypeRepository.findByBoardingHouseIsNull();
        if (globalTypes.isEmpty()) {
            return; // Already migrated or nothing to migrate
        }

        // Assign them to the boarding house with the smallest ID (the first house)
        BoardingHouse firstHouse = boardingHouseRepository.findFirstByOrderByIdAsc().orElse(null);
        if (firstHouse == null) {
            log.warn("[ServiceMigration] No boarding houses found — skipping service type migration.");
            return;
        }

        log.info("[ServiceMigration] Assigning {} global service type(s) to boarding house '{}' (id={})",
                globalTypes.size(), firstHouse.getName(), firstHouse.getId());

        for (ServiceType st : globalTypes) {
            st.setBoardingHouse(firstHouse);
            serviceTypeRepository.save(st);
        }

        log.info("[ServiceMigration] Service type migration complete.");
    }

    private void migrateGlobalServiceCatalog() {
        // Find all catalog items that have no boarding house assigned (global/legacy)
        List<ServiceCatalog> globalItems = serviceCatalogRepository.findByBoardingHouseIsNull();
        if (globalItems.isEmpty()) {
            return; // Already migrated or nothing to migrate
        }

        BoardingHouse firstHouse = boardingHouseRepository.findFirstByOrderByIdAsc().orElse(null);
        if (firstHouse == null) {
            log.warn("[ServiceMigration] No boarding houses found — skipping service catalog migration.");
            return;
        }

        log.info("[ServiceMigration] Assigning {} global service catalog item(s) to boarding house '{}' (id={})",
                globalItems.size(), firstHouse.getName(), firstHouse.getId());

        for (ServiceCatalog sc : globalItems) {
            sc.setBoardingHouse(firstHouse);
            serviceCatalogRepository.save(sc);
        }

        log.info("[ServiceMigration] Service catalog migration complete.");
    }
}
