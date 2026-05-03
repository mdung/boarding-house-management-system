package com.boardinghouse.repository;

import com.boardinghouse.entity.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceTypeRepository extends JpaRepository<ServiceType, Long> {
    List<ServiceType> findByIsActiveTrue();
    List<ServiceType> findByBoardingHouseIsNull();
    List<ServiceType> findByBoardingHouseIsNullAndIsActiveTrue();

    // Active items for a specific property OR global
    @Query("SELECT s FROM ServiceType s WHERE s.isActive = true AND (s.boardingHouse.id = :boardingHouseId OR s.boardingHouse IS NULL)")
    List<ServiceType> findActiveByBoardingHouseOrGlobal(@Param("boardingHouseId") Long boardingHouseId);

    // All items for a specific property OR global
    @Query("SELECT s FROM ServiceType s WHERE (s.boardingHouse.id = :boardingHouseId OR s.boardingHouse IS NULL)")
    List<ServiceType> findAllByBoardingHouseOrGlobal(@Param("boardingHouseId") Long boardingHouseId);

    // All items for a specific property only (for management page)
    @Query("SELECT s FROM ServiceType s WHERE s.boardingHouse.id = :boardingHouseId")
    List<ServiceType> findAllByBoardingHouseOnly(@Param("boardingHouseId") Long boardingHouseId);

    // Active items for a specific property only
    @Query("SELECT s FROM ServiceType s WHERE s.isActive = true AND s.boardingHouse.id = :boardingHouseId")
    List<ServiceType> findActiveByBoardingHouseOnly(@Param("boardingHouseId") Long boardingHouseId);
}

