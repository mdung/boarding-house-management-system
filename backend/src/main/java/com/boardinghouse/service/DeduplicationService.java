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
        // Find items that appear duplicated when viewed per boarding house
        // This includes: same name+category within same bh_id, OR same name+category 
        // where one is global (NULL) and another belongs to a specific boarding house
        String sql = """
            WITH visible_items AS (
                SELECT sc.id, sc.name, sc.category, sc.boarding_house_id,
                       COALESCE(sc.boarding_house_id, bh.id) as effective_bh_id,
                       COALESCE(bh2.name, bh.name, 'Global') as bh_name
                FROM service_catalog sc
                LEFT JOIN boarding_houses bh2 ON sc.boarding_house_id = bh2.id
                CROSS JOIN boarding_houses bh
                WHERE sc.boarding_house_id = bh.id OR sc.boarding_house_id IS NULL
            )
            SELECT name, category, effective_bh_id as bh_id, bh_name as "boardingHouseName", COUNT(*) as cnt
            FROM visible_items
            GROUP BY name, category, effective_bh_id, bh_name
            HAVING COUNT(*) > 1
            """;
        return jdbc.queryForList(sql);
    }

    private int deduplicateServiceCatalog() {
        // For each boarding house, find catalog items that appear duplicated
        // (same name+category, either both in same bh or one global + one in bh)
        // Strategy: if a bh-specific item exists, delete the global duplicate for that bh context
        // If both are in same bh (or both global), keep lowest ID
        
        String sql = """
            SELECT bh.id as bh_id, sc.name, sc.category
            FROM boarding_houses bh
            CROSS JOIN service_catalog sc
            WHERE sc.boarding_house_id = bh.id OR sc.boarding_house_id IS NULL
            GROUP BY bh.id, sc.name, sc.category
            HAVING COUNT(*) > 1
            """;
        List<Map<String, Object>> groups = jdbc.queryForList(sql);

        Set<Long> alreadyDeleted = new HashSet<>();
        int totalRemoved = 0;

        for (Map<String, Object> group : groups) {
            Long bhId = ((Number) group.get("bh_id")).longValue();
            String name = (String) group.get("name");
            String category = (String) group.get("category");

            // Get all matching items (both global and bh-specific)
            List<Map<String, Object>> items = jdbc.queryForList(
                "SELECT id, boarding_house_id FROM service_catalog WHERE name = ? AND category = ? AND (boarding_house_id = ? OR boarding_house_id IS NULL) ORDER BY boarding_house_id DESC NULLS LAST, id ASC",
                name, category, bhId);

            if (items.size() <= 1) continue;

            // Keep the bh-specific one (first in list due to ORDER BY), or lowest ID if all same scope
            Long keepId = ((Number) items.get(0).get("id")).longValue();
            
            for (int i = 1; i < items.size(); i++) {
                Long dupId = ((Number) items.get(i).get("id")).longValue();
                if (alreadyDeleted.contains(dupId)) continue;

                jdbc.update("UPDATE service_catalog_recipes SET catalog_id = ? WHERE catalog_id = ?", keepId, dupId);
                jdbc.update("DELETE FROM service_catalog WHERE id = ?", dupId);
                alreadyDeleted.add(dupId);
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
