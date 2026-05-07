package com.boardinghouse.service;

import com.boardinghouse.dto.BackupConfigDto;
import com.boardinghouse.dto.BackupHistoryDto;
import com.boardinghouse.dto.DataExportDto;
import com.boardinghouse.entity.BackupConfig;
import com.boardinghouse.entity.BackupHistory;
import com.boardinghouse.repository.BackupConfigRepository;
import com.boardinghouse.repository.BackupHistoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.TimeZone;
import java.util.concurrent.ScheduledFuture;
import java.util.stream.Collectors;

@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);

    private final DataTransferService dataTransferService;
    private final BackupHistoryRepository backupHistoryRepo;
    private final BackupConfigRepository backupConfigRepo;
    private final JavaMailSender mailSender;
    private final TaskScheduler taskScheduler;
    private final ObjectMapper objectMapper;

    @Value("${backup.email.from:noreply@yourdomain.com}")
    private String emailFrom;

    private ScheduledFuture<?> scheduledTask;

    public BackupService(DataTransferService dataTransferService,
                         BackupHistoryRepository backupHistoryRepo,
                         BackupConfigRepository backupConfigRepo,
                         JavaMailSender mailSender,
                         TaskScheduler taskScheduler) {
        this.dataTransferService = dataTransferService;
        this.backupHistoryRepo = backupHistoryRepo;
        this.backupConfigRepo = backupConfigRepo;
        this.mailSender = mailSender;
        this.taskScheduler = taskScheduler;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @PostConstruct
    public void init() {
        BackupConfig config = getOrCreateConfig();
        if (config.getEnabled()) {
            reschedule(config.getCronExpression());
            log.info("Backup scheduler initialized. Cron: {}, Description: {}, Recipients: {}",
                    config.getCronExpression(), config.getScheduleDescription(), config.getEmailRecipients());
        } else {
            log.info("Backup scheduler is DISABLED. Enable it from the admin panel.");
        }
    }

    // ─── Config Management ───────────────────────────────────────────────────

    public BackupConfigDto getConfig() {
        return toConfigDto(getOrCreateConfig());
    }

    /**
     * Check if the scheduler is currently active.
     */
    public boolean isSchedulerActive() {
        return scheduledTask != null && !scheduledTask.isCancelled() && !scheduledTask.isDone();
    }

    public BackupConfigDto updateConfig(BackupConfigDto dto, String updatedBy) {
        BackupConfig config = getOrCreateConfig();
        config.setEnabled(dto.getEnabled());
        config.setEmailRecipients(dto.getEmailRecipients() != null
                ? String.join(",", dto.getEmailRecipients()) : "");
        config.setCronExpression(dto.getCronExpression());
        config.setScheduleDescription(dto.getScheduleDescription());
        config.setUpdatedAt(LocalDateTime.now());
        config.setUpdatedBy(updatedBy);
        config = backupConfigRepo.save(config);

        // Reschedule with new cron
        if (config.getEnabled()) {
            reschedule(config.getCronExpression());
        } else {
            cancelSchedule();
        }

        return toConfigDto(config);
    }

    private BackupConfig getOrCreateConfig() {
        List<BackupConfig> configs = backupConfigRepo.findAll();
        if (configs.isEmpty()) {
            BackupConfig config = new BackupConfig();
            config.setEnabled(true);
            config.setCronExpression("0 0 0 * * ?");
            config.setScheduleDescription("Every day at 00:00");
            return backupConfigRepo.save(config);
        }
        return configs.get(0);
    }

    // ─── Dynamic Scheduling ──────────────────────────────────────────────────

    private void reschedule(String cronExpression) {
        cancelSchedule();
        try {
            // Use Asia/Ho_Chi_Minh timezone to ensure correct scheduling
            CronTrigger trigger = new CronTrigger(cronExpression, TimeZone.getTimeZone(ZoneId.of("Asia/Ho_Chi_Minh")));
            scheduledTask = taskScheduler.schedule(
                    () -> {
                        log.info("Scheduled backup triggered at {}", LocalDateTime.now());
                        performBackup("SCHEDULED", "SYSTEM");
                    },
                    trigger
            );
            log.info("Backup rescheduled with cron: {} (timezone: Asia/Ho_Chi_Minh)", cronExpression);
        } catch (Exception e) {
            log.error("Failed to schedule backup with cron '{}': {}", cronExpression, e.getMessage());
        }
    }

    private void cancelSchedule() {
        if (scheduledTask != null && !scheduledTask.isCancelled()) {
            scheduledTask.cancel(false);
            log.info("Previous backup schedule cancelled");
        }
    }

    // ─── Manual Backup ───────────────────────────────────────────────────────

    public BackupHistoryDto triggerManualBackup(String triggeredBy) {
        log.info("Manual backup triggered by {}", triggeredBy);
        BackupHistory history = performBackup("MANUAL", triggeredBy);
        return toDto(history);
    }

    // ─── Core Backup Logic ───────────────────────────────────────────────────

    private BackupHistory performBackup(String triggerType, String triggeredBy) {
        BackupHistory history = new BackupHistory(triggerType, triggeredBy);
        history = backupHistoryRepo.save(history);

        try {
            // 1. Export all data
            DataExportDto exportData = dataTransferService.exportAll(triggeredBy);

            // 2. Convert to JSON bytes
            byte[] jsonBytes = objectMapper.writeValueAsBytes(exportData);

            String fileName = "boarding-house-backup-" +
                    LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) + "-" +
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("HHmmss")) + ".json";

            history.setFileName(fileName);
            history.setFileSizeBytes((long) jsonBytes.length);

            // 3. Send email with attachment (use config from DB)
            // Always send email for both manual and scheduled backups if recipients are configured
            BackupConfig config = getOrCreateConfig();
            String recipients = config.getEmailRecipients();
            if (recipients != null && !recipients.isBlank()) {
                try {
                    sendBackupEmail(jsonBytes, fileName, recipients);
                    history.setEmailSent(true);
                    history.setEmailSentTo(recipients);
                    log.info("Backup email sent successfully to: {}", recipients);
                } catch (Exception emailEx) {
                    log.error("Failed to send backup email to {}: {}", recipients, emailEx.getMessage(), emailEx);
                    // Don't fail the entire backup just because email failed
                    history.setEmailSent(false);
                    history.setErrorMessage("Backup OK nhưng gửi email thất bại: " + emailEx.getMessage());
                }
            } else {
                log.warn("No email recipients configured, skipping email send");
                history.setEmailSent(false);
            }

            history.setStatus("SUCCESS");
            history.setCompletedAt(LocalDateTime.now());
            log.info("Backup completed successfully. File: {}, Size: {} bytes", fileName, jsonBytes.length);

        } catch (Exception e) {
            log.error("Backup failed: {}", e.getMessage(), e);
            history.setStatus("FAILED");
            history.setCompletedAt(LocalDateTime.now());
            history.setErrorMessage(e.getMessage());
        }

        return backupHistoryRepo.save(history);
    }

    // ─── Email Sending ───────────────────────────────────────────────────────

    private void sendBackupEmail(byte[] jsonBytes, String fileName, String recipients) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(emailFrom);
        helper.setTo(recipients.split(","));
        helper.setSubject("\uD83D\uDDC4\uFE0F Boarding House Backup - " + LocalDate.now());
        helper.setText(buildEmailBody(fileName, jsonBytes.length), true);

        // Attach the JSON backup file
        helper.addAttachment(fileName, new ByteArrayResource(jsonBytes), "application/json");

        mailSender.send(message);
        log.info("Backup email sent to {}", recipients);
    }

    private String buildEmailBody(String fileName, int fileSize) {
        String sizeFormatted = fileSize > 1024 * 1024
                ? String.format("%.2f MB", fileSize / (1024.0 * 1024.0))
                : String.format("%.2f KB", fileSize / 1024.0);

        return """
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #2563eb;">\uD83D\uDDC4\uFE0F Database Backup - Boarding House Management</h2>
                <p>Backup đã được tạo thành công.</p>
                <table style="border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; font-weight: bold;">File:</td><td style="padding: 8px;">%s</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Size:</td><td style="padding: 8px;">%s</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Time:</td><td style="padding: 8px;">%s</td></tr>
                </table>
                <p style="color: #6b7280; font-size: 12px;">
                    File backup được đính kèm trong email này. Để restore, vào trang Data Transfer và import file JSON này.
                </p>
            </body>
            </html>
            """.formatted(fileName, sizeFormatted, LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
    }

    // ─── Query History ───────────────────────────────────────────────────────

    public Page<BackupHistoryDto> getHistory(String status, String triggerType,
                                              LocalDateTime startDate, LocalDateTime endDate,
                                              Pageable pageable) {
        return backupHistoryRepo.search(status, triggerType, startDate, endDate, pageable)
                .map(this::toDto);
    }

    public BackupHistoryDto getById(Long id) {
        return backupHistoryRepo.findById(id).map(this::toDto).orElse(null);
    }

    public BackupStatsDto getStats() {
        long total = backupHistoryRepo.count();
        long success = backupHistoryRepo.countByStatus("SUCCESS");
        long failed = backupHistoryRepo.countByStatus("FAILED");
        BackupHistory lastSuccess = backupHistoryRepo.findTopByStatusOrderByCreatedAtDesc("SUCCESS").orElse(null);

        return new BackupStatsDto(total, success, failed,
                lastSuccess != null ? lastSuccess.getCreatedAt() : null);
    }

    // ─── DTO Conversion ──────────────────────────────────────────────────────

    private BackupHistoryDto toDto(BackupHistory entity) {
        return new BackupHistoryDto(
                entity.getId(),
                entity.getStatus(),
                entity.getTriggerType(),
                entity.getCreatedAt(),
                entity.getCompletedAt(),
                entity.getTriggeredBy(),
                entity.getFileSizeBytes(),
                entity.getEmailSentTo(),
                entity.getEmailSent(),
                entity.getErrorMessage(),
                entity.getFileName()
        );
    }

    private BackupConfigDto toConfigDto(BackupConfig entity) {
        List<String> emails = (entity.getEmailRecipients() != null && !entity.getEmailRecipients().isBlank())
                ? Arrays.stream(entity.getEmailRecipients().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList())
                : Collections.emptyList();

        return new BackupConfigDto(
                entity.getId(),
                entity.getEnabled(),
                emails,
                entity.getCronExpression(),
                entity.getScheduleDescription(),
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    // ─── Stats DTO ───────────────────────────────────────────────────────────

    public record BackupStatsDto(long total, long success, long failed, LocalDateTime lastSuccessAt) {}
}
