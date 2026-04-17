package com.boardinghouse.repository;

import com.boardinghouse.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query(value = """
        SELECT a FROM AuditLog a
        LEFT JOIN a.user u
        WHERE (:userId IS NULL OR u.id = :userId)
          AND (:module IS NULL OR a.module = :module)
          AND (:action IS NULL OR a.action = :action)
          AND (:start IS NULL OR a.timestamp >= :start)
          AND (:end IS NULL OR a.timestamp <= :end)
        ORDER BY a.timestamp DESC
        """,
        countQuery = """
        SELECT COUNT(a) FROM AuditLog a
        LEFT JOIN a.user u
        WHERE (:userId IS NULL OR u.id = :userId)
          AND (:module IS NULL OR a.module = :module)
          AND (:action IS NULL OR a.action = :action)
          AND (:start IS NULL OR a.timestamp >= :start)
          AND (:end IS NULL OR a.timestamp <= :end)
        """)
    Page<AuditLog> search(
        @Param("userId") Long userId,
        @Param("module") String module,
        @Param("action") String action,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        Pageable pageable
    );
}
