package com.boardinghouse.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_user", columnList = "user_id"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_module", columnList = "module")
})
@Data
@NoArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String action; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW

    @Column(nullable = false, length = 50)
    private String module; // ROOM, TENANT, CONTRACT, INVOICE, PAYMENT, STAFF, INVENTORY, etc.

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(length = 45)
    private String ipAddress;

    public AuditLog(User user, String action, String module, String details) {
        this.user = user;
        this.action = action;
        this.module = module;
        this.details = details;
        this.timestamp = LocalDateTime.now();
    }
}
