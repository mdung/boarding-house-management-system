package com.boardinghouse.repository;

import com.boardinghouse.entity.MonthlyExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonthlyExpenseRepository extends JpaRepository<MonthlyExpense, Long> {
    List<MonthlyExpense> findByBoardingHouseIdAndMonthAndYearOrderByCategoryAsc(Long boardingHouseId, Integer month, Integer year);
    List<MonthlyExpense> findByBoardingHouseIdAndYearOrderByMonthDescCategoryAsc(Long boardingHouseId, Integer year);
    List<MonthlyExpense> findByMonthAndYearOrderByCategoryAsc(Integer month, Integer year);

    @Query("SELECT DISTINCT e.year FROM MonthlyExpense e WHERE e.boardingHouse.id = :bhId ORDER BY e.year DESC")
    List<Integer> findDistinctYearsByBoardingHouseId(@Param("bhId") Long bhId);
}
