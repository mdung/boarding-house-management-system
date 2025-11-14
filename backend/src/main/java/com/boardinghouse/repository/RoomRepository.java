package com.boardinghouse.repository;

import com.boardinghouse.entity.Room;
import com.boardinghouse.entity.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByCode(String code);
    List<Room> findByBoardingHouseId(Long boardingHouseId);
    List<Room> findByStatus(RoomStatus status);
    boolean existsByCode(String code);
}

