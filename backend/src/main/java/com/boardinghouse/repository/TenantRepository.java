package com.boardinghouse.repository;

import com.boardinghouse.entity.Tenant;
import com.boardinghouse.entity.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByUserId(Long userId);
    List<Tenant> findByStatus(TenantStatus status);
}

