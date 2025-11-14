package com.boardinghouse.repository;

import com.boardinghouse.entity.Invoice;
import com.boardinghouse.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByCode(String code);
    List<Invoice> findByContractId(Long contractId);
    List<Invoice> findByRoomId(Long roomId);
    List<Invoice> findByStatus(PaymentStatus status);
    List<Invoice> findByPeriodMonthAndPeriodYear(Integer month, Integer year);
    List<Invoice> findByContractIdAndPeriodMonthAndPeriodYear(Long contractId, Integer month, Integer year);
    boolean existsByCode(String code);
}

