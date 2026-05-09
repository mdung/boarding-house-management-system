package com.boardinghouse.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Drops legacy check constraints on user_roles and user_permissions tables.
 * Safe to run multiple times - ignores errors if constraints don't exist.
 */
@Component
public class DatabaseConstraintFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseConstraintFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        String[] tables = {"user_roles", "user_permissions"};
        for (String table : tables) {
            try {
                jdbcTemplate.execute(
                    "DO $$ DECLARE r RECORD; BEGIN " +
                    "FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = '" + table + "'::regclass AND contype = 'c') LOOP " +
                    "EXECUTE 'ALTER TABLE " + table + " DROP CONSTRAINT ' || r.conname; " +
                    "END LOOP; END $$;");
            } catch (Exception e) {
                // Ignore - constraints may not exist or DB doesn't support this syntax
            }
        }
    }
}
