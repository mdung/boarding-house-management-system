package com.boardinghouse.repository;

import com.boardinghouse.entity.GuestServiceCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface GuestServiceChargeRepository extends JpaRepository<GuestServiceCharge, Long> {
    List<GuestServiceCharge> findByContractIdOrderByChargeDateDesc(Long contractId);
    List<GuestServiceCharge> findByRoomIdAndChargeDateBetween(Long roomId, LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(g.amount), 0) FROM GuestServiceCharge g WHERE g.contract.id = :contractId")
    BigDecimal sumAmountByContractId(@Param("contractId") Long contractId);

    List<GuestServiceCharge> findByContractIdAndChargeDateOrderByChargeDateDesc(Long contractId, LocalDate date);
}
