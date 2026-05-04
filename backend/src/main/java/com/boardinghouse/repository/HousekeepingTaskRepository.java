package com.boardinghouse.repository;

import com.boardinghouse.entity.HousekeepingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HousekeepingTaskRepository extends JpaRepository<HousekeepingTask, Long> {

    /** All tasks for a boarding house (via room → boarding house) */
    @Query("SELECT t FROM HousekeepingTask t WHERE t.room.boardingHouse.id = :bhId ORDER BY t.scheduledDate ASC, t.priority DESC")
    List<HousekeepingTask> findByBoardingHouseId(@Param("bhId") Long bhId);

    /** Tasks for a specific date range */
    @Query("SELECT t FROM HousekeepingTask t WHERE t.room.boardingHouse.id = :bhId AND t.scheduledDate BETWEEN :from AND :to ORDER BY t.scheduledDate ASC")
    List<HousekeepingTask> findByBoardingHouseAndDateRange(@Param("bhId") Long bhId,
                                                          @Param("from") LocalDate from,
                                                          @Param("to") LocalDate to);

    /** Pending/In-progress tasks for a boarding house */
    @Query("SELECT t FROM HousekeepingTask t WHERE t.room.boardingHouse.id = :bhId AND t.status IN ('PENDING','IN_PROGRESS') ORDER BY t.scheduledDate ASC")
    List<HousekeepingTask> findActiveTasks(@Param("bhId") Long bhId);

    /** All tasks for a specific room */
    List<HousekeepingTask> findByRoomIdOrderByScheduledDateDesc(Long roomId);

    /** Check if a pending checkout-triggered task already exists for a contract */
    boolean existsByContractIdAndStatus(Long contractId, HousekeepingTask.TaskStatus status);
}
