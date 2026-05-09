package com.boardinghouse.service;

import com.boardinghouse.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DeduplicationService {

    private final JdbcTemplate jdbc;

    public DeduplicationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Scan for duplicates without deleting.
     * Returns a map of table → list of duplicate groups.
     */
    public Map<String, Object> scan() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("serviceCatalog", scanServiceCatalogDuplicates());
        result.put("inventoryItems", scanInventoryItemDuplicates());
        return result;
    }

    /**
     * Remove duplicates safely:
     * - Keep the record with the lowest ID (original)
     * - Reassign all FK references from duplicates to the original
     * - Then delete the duplicates
     */
    @Transactional
    public Map<String, Object> removeDuplicates() {
        Map<String, Object> stats = new LinkedHashMap<>();
        int catalogRemoved = deduplicateServiceCatalog();
        int inventoryRemoved = deduplicateInventoryItems();
        stats.put("serviceCatalogRemoved", catalogRemoved);
        stats.put("inventoryItemsRemoved", inventoryRemoved);
        return stats;
    }

    // ─── Service Catalog ─────────────────────────────────────────────────────

    private List<Map<String, Object>> scanServiceCatalogDuplicates() {
        // Duplicates = same name + category + same boarding_house_id (within same property)
        // COALESCE treats NULL as 0 so global items are grouped together
        String sql = """
            SELECT name, category, COALESCE(boarding_house_id, 0) as bh_id, COUNT(*) as cnt,
                   MIN(id) as keep_id
            FROM service_catalog
            GROUP BY name, category, COALESCE(boarding_house_id, 0)
            HAVING COUNT(*) > 1
            """;
        List<Map<String, Object>> raw = jdbc.queryForList(sql);

        // Enrich with boarding house name
        for (Map<String, Object> row : raw) {
            Long bhId = ((Number) row.get("bh_id")).longValue();
            if (bhId > 0) {
                String bhName = jdbc.queryForObject(
                    "SELECT name FROM boarding_houses WHERE id = ?", String.class, bhId);
                row.put("boardingHouseName", bhName);
            } else {
                row.put("boardingHouseName", "Global (chung)");
            }
        }
        return raw;
    }

    private int deduplicateServiceCatalog() {
        String sql = """
            SELECT name, category, COALESCE(boarding_house_id, 0) as bh_id
            FROM service_catalog
            GROUP BY name, category, COALESCE(boarding_house_id, 0)
            HAVING COUNT(*) > 1
            """;
        List<Map<String, Object>> groups = jdbc.queryForList(sql);

        int totalRemoved = 0;
        for (Map<String, Object> group : groups) {
            String name = (String) group.get("name");
            String category = (String) group.get("category");
            Long bhId = ((Number) group.get("bh_id")).longValue();

            List<Long> ids;
            if (bhId > 0) {
                ids = jdbc.queryForList(
                    "SELECT id FROM service_catalog WHERE name = ? AND category = ? AND boarding_house_id = ? ORDER BY id",
                    Long.class, name, category, bhId);
            } else {
                ids = jdbc.queryForList(
                    "SELECT id FROM service_catalog WHERE name = ? AND category = ? AND boarding_house_id IS NULL ORDER BY id",
                    Long.class, name, category);
            }

            if (ids.size() <= 1) continue;

            Long keepId = ids.get(0);
            List<Long> removeIds = ids.subList(1, ids.size());

            for (Long dupId : removeIds) {
                jdbc.update("UPDATE service_catalog_recipes SET catalog_id = ? WHERE catalog_id = ?", keepId, dupId);
                jdbc.update("DELETE FROM service_catalog WHERE id = ?", dupId);
                totalRemoved++;
            }
        }

        Long maxId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM service_catalog", Long.class);
        if (maxId != null && maxId > 0) {
            jdbc.execute("SELECT setval(pg_get_serial_sequence('service_catalog', 'id'), " + maxId + ", true)");
        }

        return totalRemoved;
    }

    // ─── Inventory Items ─────────────────────────────────────────────────────

    private List<Map<String, Object>> scanInventoryItemDuplicates() {
        // Duplicates = same name within same boarding house
        String sql = """
            SELECT name, COALESCE(boarding_house_id, 0) as bh_id, COUNT(*) as cnt,
                   MIN(id) as keep_id
            FROM inventory_items
            GROUP BY name, COALESCE(boarding_house_id, 0)
            HAVING COUNT(*) > 1
            """;
        List<Map<String, Object>> raw = jdbc.queryForList(sql);

        for (Map<String, Object> row : raw) {
            Long bhId = ((Number) row.get("bh_id")).longValue();
            if (bhId > 0) {
                String bhName = jdbc.queryForObject(
                    "SELECT name FROM boarding_houses WHERE id = ?", String.class, bhId);
                row.put("boardingHouseName", bhName);
            } else {
                row.put("boardingHouseName", "Global (chung)");
            }
        }
        return raw;
    }

    private int deduplicateInventoryItems() {
        String sql = """
            SELECT name, COALESCE(boarding_house_id, 0) as bh_id
            FROM inventory_items
            GROUP BY name, COALESCE(boarding_house_id, 0)
            HAVING COUNT(*) > 1
            """;
        List<Map<String, Object>> groups = jdbc.queryForList(sql);

        int totalRemoved = 0;
        for (Map<String, Object> group : groups) {
            String name = (String) group.get("name");
            Long bhId = ((Number) group.get("bh_id")).longValue();

            List<Long> ids;
            if (bhId > 0) {
                ids = jdbc.queryForList(
                    "SELECT id FROM inventory_items WHERE name = ? AND boarding_house_id = ? ORDER BY id",
                    Long.class, name, bhId);
            } else {
                ids = jdbc.queryForList(
                    "SELECT id FROM inventory_items WHERE name = ? AND boarding_house_id IS NULL ORDER BY id",
                    Long.class, name);
            }

            if (ids.size() <= 1) continue;

            Long keepId = ids.get(0);
            List<Long> removeIds = ids.subList(1, ids.size());

            for (Long dupId : removeIds) {
                jdbc.update("UPDATE inventory_transactions SET item_id = ? WHERE item_id = ?", keepId, dupId);
                jdbc.update("UPDATE guest_service_charges SET inventory_item_id = ? WHERE inventory_item_id = ?", keepId, dupId);
                jdbc.update("UPDATE service_catalog SET inventory_item_id = ? WHERE inventory_item_id = ?", keepId, dupId);
                jdbc.update("UPDATE service_catalog_recipes SET inventory_item_id = ? WHERE inventory_item_id = ?", keepId, dupId);
                jdbc.update("DELETE FROM inventory_items WHERE id = ?", dupId);
                totalRemoved++;
            }
        }

        Long maxId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM inventory_items", Long.class);
        if (maxId != null && maxId > 0) {
            jdbc.execute("SELECT setval(pg_get_serial_sequence('inventory_items', 'id'), " + maxId + ", true)");
        }

        return totalRemoved;
    }
}
