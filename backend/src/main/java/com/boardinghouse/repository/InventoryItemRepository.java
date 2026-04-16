package com.boardinghouse.repository;

import com.boardinghouse.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByIsActiveTrueOrderByCategoryAscNameAsc();
}
