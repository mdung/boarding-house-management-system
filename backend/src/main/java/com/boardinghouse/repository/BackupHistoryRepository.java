package com.boardinghouse.repository;

import com.boardinghouse.entity.BackupHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BackupHistoryRepository extends JpaRepository<BackupHistory, Long> {

    Page<BackupHistory> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT b FROM BackupHistory b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:triggerType IS NULL OR b.triggerType = :triggerType) AND " +
           "(CAST(:startDate AS timestamp) IS NULL OR b.createdAt >= :startDate) AND " +
           "(CAST(:endDate AS timestamp) IS NULL OR b.createdAt <= :endDate) " +
           "ORDER BY b.createdAt DESC")
    Page<BackupHistory> search(
            @Param("status") String status,
            @Param("triggerType") String triggerType,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    Optional<BackupHistory> findTopByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);
}
