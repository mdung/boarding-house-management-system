package com.boardinghouse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BackupConfigDto {
    private Long id;
    private Boolean enabled;
    private List<String> emailRecipients;
    private String cronExpression;
    private String scheduleDescription;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
