package com.boardinghouse.service;

import com.boardinghouse.dto.AuditLogDto;
import com.boardinghouse.entity.AuditLog;
import com.boardinghouse.entity.User;
import com.boardinghouse.repository.AuditLogRepository;
import com.boardinghouse.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditLogService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String module, String details) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return;
            User user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user == null) return;
            auditLogRepository.save(new AuditLog(user, action, module, details));
        } catch (Exception ignored) {}
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAs(String username, String action, String module, String details) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) return;
            auditLogRepository.save(new AuditLog(user, action, module, details));
        } catch (Exception ignored) {}
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> search(Long userId, String module, String action,
                                     LocalDateTime start, LocalDateTime end,
                                     int page, int size) {
        return auditLogRepository.search(userId, module, action, start, end, PageRequest.of(page, size))
                .map(this::toDto);
    }

    private AuditLogDto toDto(AuditLog log) {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(log.getId());
        dto.setAction(log.getAction());
        dto.setModule(log.getModule());
        dto.setDetails(log.getDetails());
        dto.setTimestamp(log.getTimestamp());
        dto.setIpAddress(log.getIpAddress());
        if (log.getUser() != null) {
            dto.setUserId(log.getUser().getId());
            dto.setUsername(log.getUser().getUsername());
            dto.setFullName(log.getUser().getFullName());
        }
        return dto;
    }
}
