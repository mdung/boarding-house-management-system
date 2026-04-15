package com.boardinghouse.repository;

import com.boardinghouse.entity.ServiceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceCatalogRepository extends JpaRepository<ServiceCatalog, Long> {
    List<ServiceCatalog> findByIsActiveTrueOrderByCategoryAscSortOrderAsc();
    List<ServiceCatalog> findByCategoryAndIsActiveTrue(String category);
}
