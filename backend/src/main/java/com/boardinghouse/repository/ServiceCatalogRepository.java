package com.boardinghouse.repository;

import com.boardinghouse.entity.ServiceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceCatalogRepository extends JpaRepository<ServiceCatalog, Long> {
    List<ServiceCatalog> findByIsActiveTrueOrderByCategoryAscSortOrderAsc();
    List<ServiceCatalog> findByCategoryAndIsActiveTrue(String category);
    List<ServiceCatalog> findByBoardingHouseIsNull();
    List<ServiceCatalog> findByBoardingHouseIsNullAndIsActiveTrueOrderByCategoryAscSortOrderAsc();

    // Active items for a specific property OR global (null boardingHouse)
    @Query("SELECT s FROM ServiceCatalog s WHERE s.isActive = true AND (s.boardingHouse.id = :boardingHouseId OR s.boardingHouse IS NULL) ORDER BY s.category ASC, s.sortOrder ASC")
    List<ServiceCatalog> findActiveByBoardingHouseOrGlobal(@Param("boardingHouseId") Long boardingHouseId);

    // All items (active + inactive) for a specific property OR global
    @Query("SELECT s FROM ServiceCatalog s WHERE (s.boardingHouse.id = :boardingHouseId OR s.boardingHouse IS NULL) ORDER BY s.category ASC, s.sortOrder ASC")
    List<ServiceCatalog> findAllByBoardingHouseOrGlobal(@Param("boardingHouseId") Long boardingHouseId);

    // All items for a specific property only (for management page)
    @Query("SELECT s FROM ServiceCatalog s WHERE s.boardingHouse.id = :boardingHouseId ORDER BY s.category ASC, s.sortOrder ASC")
    List<ServiceCatalog> findAllByBoardingHouseOnly(@Param("boardingHouseId") Long boardingHouseId);

    // Active items for a specific property only (no global fallback)
    @Query("SELECT s FROM ServiceCatalog s WHERE s.isActive = true AND s.boardingHouse.id = :boardingHouseId ORDER BY s.category ASC, s.sortOrder ASC")
    List<ServiceCatalog> findActiveByBoardingHouseOnly(@Param("boardingHouseId") Long boardingHouseId);
}
