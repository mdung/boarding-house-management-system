package com.boardinghouse.config;

import com.boardinghouse.entity.AuditLog;
import com.boardinghouse.entity.User;
import com.boardinghouse.repository.AuditLogRepository;
import com.boardinghouse.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@Order(2)
public class AuditLogSeeder implements CommandLineRunner {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditLogSeeder(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (auditLogRepository.count() > 0) return;

        Optional<User> adminOpt = userRepository.findByUsername("admin");
        if (adminOpt.isEmpty()) return;
        User admin = adminOpt.get();

        List<User> staffUsers = userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.name().equals("STAFF")))
                .toList();

        User actor = staffUsers.isEmpty() ? admin : staffUsers.get(0);

        LocalDateTime now = LocalDateTime.now();
        auditLogRepository.saveAll(List.of(
            makeLog(admin, "LOGIN",  "AUTH",      "User logged in: admin",                          now.minusHours(2)),
            makeLog(admin, "CREATE", "ROOM",       "Created room: P101 in Nhà Trọ Ánh Dương",       now.minusHours(2).plusMinutes(5)),
            makeLog(admin, "UPDATE", "ROOM",       "Updated room: P102",                             now.minusHours(1).plusMinutes(10)),
            makeLog(admin, "CREATE", "TENANT",     "Created tenant: Nguyen Van A",                   now.minusHours(1).plusMinutes(20)),
            makeLog(admin, "CREATE", "CONTRACT",   "Created contract: HD001",                        now.minusHours(1).plusMinutes(30)),
            makeLog(admin, "CREATE", "INVOICE",    "Generated invoice for contract HD001",           now.minusMinutes(50)),
            makeLog(admin, "UPDATE", "TENANT",     "Updated tenant: Tran Thi Bich",                  now.minusMinutes(40)),
            makeLog(actor, "LOGIN",  "AUTH",       "User logged in: " + actor.getUsername(),         now.minusMinutes(30)),
            makeLog(actor, "UPDATE", "ROOM",       "Updated room: P103",                             now.minusMinutes(25)),
            makeLog(actor, "CREATE", "TENANT",     "Created tenant: Le Van B",                       now.minusMinutes(20)),
            makeLog(admin, "UPDATE_PERMISSIONS", "STAFF", "Updated roles/permissions for: " + actor.getUsername(), now.minusMinutes(15)),
            makeLog(admin, "CREATE", "STAFF",      "Created staff account: newstaff",                now.minusMinutes(10)),
            makeLog(actor, "DELETE", "ROOM",       "Deleted room: P999",                             now.minusMinutes(5)),
            makeLog(admin, "LOGIN",  "AUTH",       "User logged in: admin",                          now.minusMinutes(2))
        ));
    }

    private AuditLog makeLog(User user, String action, String module, String details, LocalDateTime ts) {
        AuditLog log = new AuditLog(user, action, module, details);
        log.setTimestamp(ts);
        return log;
    }
}
