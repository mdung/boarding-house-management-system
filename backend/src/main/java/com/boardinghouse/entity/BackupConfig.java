package com.boardinghouse.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "backup_config")
public class BackupConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Boolean enabled = true;

    /**
     * Comma-separated list of email addresses to send backup to.
     */
    @Column(columnDefinition = "TEXT")
    private String emailRecipients;

    /**
     * Cron expression for scheduled backup.
     * Default: "0 0 0 * * ?" (midnight every day)
     */
    @Column(nullable = false, length = 50)
    private String cronExpression = "0 0 0 * * ?";

    /**
     * Human-readable schedule description for display.
     * e.g. "Every day at 00:00"
     */
    @Column(length = 100)
    private String scheduleDescription = "Every day at 00:00";

    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(length = 100)
    private String updatedBy;

    public BackupConfig() {}

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getEmailRecipients() { return emailRecipients; }
    public void setEmailRecipients(String emailRecipients) { this.emailRecipients = emailRecipients; }

    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }

    public String getScheduleDescription() { return scheduleDescription; }
    public void setScheduleDescription(String scheduleDescription) { this.scheduleDescription = scheduleDescription; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
