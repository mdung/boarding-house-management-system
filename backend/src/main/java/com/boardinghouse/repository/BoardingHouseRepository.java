package com.boardinghouse.repository;

import com.boardinghouse.entity.BoardingHouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BoardingHouseRepository extends JpaRepository<BoardingHouse, Long> {
    Optional<BoardingHouse> findFirstByOrderByIdAsc();
}

