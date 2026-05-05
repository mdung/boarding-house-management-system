package com.boardinghouse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BackupHistoryDto {
    private Long id;
    private String status;
    private String triggerType;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String triggeredBy;
    private Long fileSizeBytes;
    private String emailSentTo;
    private Boolean emailSent;
    private String errorMessage;
    private String fileName;
}
