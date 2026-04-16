package com.boardinghouse.repository;

import com.boardinghouse.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByItemIdOrderByCreatedDateDesc(Long itemId);
}
