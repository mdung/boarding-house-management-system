package com.boardinghouse;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
public class BoardingHouseApplication {
    public static void main(String[] args) {
        SpringApplication.run(BoardingHouseApplication.class, args);
    }

    @Bean
    public CommandLineRunner updateDatabase(JdbcTemplate jdbcTemplate) {
        return args -> {
            String[] tables = {"user_roles", "user_permissions"};
            String[] constraintSuffixes = {"_role_check", "_permission_check", "_role_check1", "_permission_check1"};
            
            for (String table : tables) {
                // Try Postgres specific powerful block
                try {
                    jdbcTemplate.execute(
                        "DO $$ DECLARE r RECORD; BEGIN " +
                        "FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = '" + table + "'::regclass AND contype = 'c') LOOP " +
                        "EXECUTE 'ALTER TABLE " + table + " DROP CONSTRAINT ' || r.conname; " +
                        "END LOOP; END $$;");
                } catch (Exception e) {
                    // Fallback to manual drops for other DBs (H2, etc.)
                    for (String suffix : constraintSuffixes) {
                        try {
                            jdbcTemplate.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + table + suffix);
                        } catch (Exception ex) { /* Ignore */ }
                    }
                }
            }
        };
    }
}

