package com.boardinghouse.repository;

import com.boardinghouse.entity.RoomPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomPhotoRepository extends JpaRepository<RoomPhoto, Long> {

    /** Photos for a specific room, ordered by sort order */
    List<RoomPhoto> findByRoomIdOrderBySortOrderAscUploadedAtAsc(Long roomId);

    /** Photos for all rooms in a boarding house — filtered! */
    @Query("SELECT p FROM RoomPhoto p WHERE p.room.boardingHouse.id = :bhId ORDER BY p.room.code ASC, p.sortOrder ASC")
    List<RoomPhoto> findByBoardingHouseId(@Param("bhId") Long bhId);

    /** Primary photo for a room */
    RoomPhoto findByRoomIdAndIsPrimaryTrue(Long roomId);

    /** Count photos per room */
    long countByRoomId(Long roomId);
}
