package com.boardinghouse.repository;

import com.boardinghouse.entity.Contract;
import com.boardinghouse.entity.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    Optional<Contract> findByCode(String code);
    List<Contract> findByRoomId(Long roomId);
    List<Contract> findByMainTenantId(Long tenantId);
    List<Contract> findByStatus(ContractStatus status);
    boolean existsByCode(String code);

    // Checkout activity queries
    List<Contract> findByEndDateAndStatus(LocalDate endDate, ContractStatus status);
    List<Contract> findByStartDateAndStatus(LocalDate startDate, ContractStatus status);

    @Query("SELECT c FROM Contract c JOIN FETCH c.room r JOIN FETCH r.boardingHouse JOIN FETCH c.mainTenant WHERE c.status = 'ACTIVE' ORDER BY c.endDate ASC")
    List<Contract> findAllActiveOrderByEndDate();

    // For tenant list: get active contract for a tenant
    @Query("SELECT c FROM Contract c JOIN FETCH c.room r JOIN FETCH r.boardingHouse WHERE c.mainTenant.id = :tenantId AND c.status = 'ACTIVE' ORDER BY c.startDate DESC")
    Optional<Contract> findActiveByMainTenantId(@Param("tenantId") Long tenantId);

    @Query("SELECT c FROM Contract c JOIN FETCH c.mainTenant WHERE c.room.id = :roomId AND c.status = 'ACTIVE' ORDER BY c.startDate DESC")
    Optional<Contract> findActiveByRoomId(@Param("roomId") Long roomId);
}

