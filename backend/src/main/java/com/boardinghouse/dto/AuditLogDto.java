package com.boardinghouse.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AuditLogDto {
    private Long id;
    private Long userId;
    private String username;
    private String fullName;
    private String action;
    private String module;
    private String details;
    private LocalDateTime timestamp;
    private String ipAddress;
}
