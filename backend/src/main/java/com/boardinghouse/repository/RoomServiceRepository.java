package com.boardinghouse.repository;

import com.boardinghouse.entity.RoomService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomServiceRepository extends JpaRepository<RoomService, Long> {
    List<RoomService> findByRoomId(Long roomId);
    void deleteByRoomId(Long roomId);
}

