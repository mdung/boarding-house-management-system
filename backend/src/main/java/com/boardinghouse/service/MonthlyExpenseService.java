package com.boardinghouse.service;

import com.boardinghouse.dto.MonthlyExpenseDto;
import com.boardinghouse.entity.BoardingHouse;
import com.boardinghouse.entity.MonthlyExpense;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.BoardingHouseRepository;
import com.boardinghouse.repository.MonthlyExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MonthlyExpenseService {
    private final MonthlyExpenseRepository repository;
    private final BoardingHouseRepository boardingHouseRepository;

    public MonthlyExpenseService(MonthlyExpenseRepository repository, BoardingHouseRepository boardingHouseRepository) {
        this.repository = repository;
        this.boardingHouseRepository = boardingHouseRepository;
    }

    public List<MonthlyExpenseDto> getByMonth(Long boardingHouseId, int month, int year) {
        if (boardingHouseId != null) {
            return repository.findByBoardingHouseIdAndMonthAndYearOrderByCategoryAsc(boardingHouseId, month, year)
                    .stream().map(this::toDto).collect(Collectors.toList());
        }
        return repository.findByMonthAndYearOrderByCategoryAsc(month, year)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<MonthlyExpenseDto> getByYear(Long boardingHouseId, int year) {
        return repository.findByBoardingHouseIdAndYearOrderByMonthDescCategoryAsc(boardingHouseId, year)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<Integer> getAvailableYears(Long boardingHouseId) {
        return repository.findDistinctYearsByBoardingHouseId(boardingHouseId);
    }

    /** Summary: total per category for a month */
    public Map<String, Object> getMonthlySummary(Long boardingHouseId, int month, int year) {
        List<MonthlyExpense> expenses = boardingHouseId != null
                ? repository.findByBoardingHouseIdAndMonthAndYearOrderByCategoryAsc(boardingHouseId, month, year)
                : repository.findByMonthAndYearOrderByCategoryAsc(month, year);

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (MonthlyExpense e : expenses) {
            byCategory.merge(e.getCategory(), e.getAmount(), BigDecimal::add);
            total = total.add(e.getAmount());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month", month);
        result.put("year", year);
        result.put("total", total);
        result.put("byCategory", byCategory);
        result.put("count", expenses.size());
        return result;
    }

    @Transactional
    public MonthlyExpenseDto create(MonthlyExpenseDto dto) {
        MonthlyExpense e = new MonthlyExpense();
        return toDto(repository.save(fromDto(e, dto)));
    }

    @Transactional
    public MonthlyExpenseDto update(Long id, MonthlyExpenseDto dto) {
        MonthlyExpense e = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + id));
        return toDto(repository.save(fromDto(e, dto)));
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private MonthlyExpense fromDto(MonthlyExpense e, MonthlyExpenseDto dto) {
        BoardingHouse bh = boardingHouseRepository.findById(dto.getBoardingHouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Boarding house not found"));
        e.setBoardingHouse(bh);
        e.setMonth(dto.getMonth());
        e.setYear(dto.getYear());
        e.setCategory(dto.getCategory());
        e.setDescription(dto.getDescription());
        e.setAmount(dto.getAmount());
        e.setNote(dto.getNote());
        return e;
    }

    private MonthlyExpenseDto toDto(MonthlyExpense e) {
        MonthlyExpenseDto dto = new MonthlyExpenseDto();
        dto.setId(e.getId());
        dto.setBoardingHouseId(e.getBoardingHouse().getId());
        dto.setBoardingHouseName(e.getBoardingHouse().getName());
        dto.setMonth(e.getMonth());
        dto.setYear(e.getYear());
        dto.setCategory(e.getCategory());
        dto.setDescription(e.getDescription());
        dto.setAmount(e.getAmount());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }
}
