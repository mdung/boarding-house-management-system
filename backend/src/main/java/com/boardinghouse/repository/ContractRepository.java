package com.boardinghouse.repository;

import com.boardinghouse.entity.Contract;
import com.boardinghouse.entity.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    Optional<Contract> findByCode(String code);
    List<Contract> findByRoomId(Long roomId);
    List<Contract> findByMainTenantId(Long tenantId);
    List<Contract> findByStatus(ContractStatus status);
    boolean existsByCode(String code);
}

