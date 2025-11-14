package com.boardinghouse.repository;

import com.boardinghouse.entity.BoardingHouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BoardingHouseRepository extends JpaRepository<BoardingHouse, Long> {
}

