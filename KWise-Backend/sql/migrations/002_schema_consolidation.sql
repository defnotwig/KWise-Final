-- ============================================================================
-- Migration 002: Schema Consolidation
-- Date: 2025-01-13
-- Author: Database Architect (MCP Expert)
-- 
-- Purpose:
--   1. Fix orphaned component rows (referential integrity)
--   2. Add FK constraints: component tables -> pc_parts (Table-Per-Type pattern)
--   3. Add soft-delete (is_active) to component tables lacking it
--   4. Rename dead/empty tables with _deprecated_ prefix
--   5. Create backward-compatible views for renamed tables
--   6. Document settings table separation
--
-- Safety: NO DATA IS DELETED. Dead tables are renamed, not dropped.
-- ============================================================================

BEGIN;

-- ==========================================================================
-- STEP 1: Fix orphaned cooling row (id=726 has no pc_parts parent)
-- ==========================================================================

-- Insert the missing pc_parts parent for cooling id=726
-- pc_parts requires: id, name, brand (NOT NULL), price (NOT NULL), stock (NOT NULL)
-- Also: tier must match tier_classification_check
INSERT INTO pc_parts (id, name, brand, category, price, stock, is_active, tier, created_at, updated_at)
SELECT 
    c.id,
    c.name,
    'Thermalright',       -- brand extracted from product name
    'Cooling',
    COALESCE(c.price, 0),
    0,                    -- stock unknown, default to 0
    true,
    'Mid Tier',           -- based on price range ~4799
    COALESCE(c.created_at, NOW()),
    COALESCE(c.updated_at, NOW())
FROM cooling c
WHERE c.id = 726
AND NOT EXISTS (SELECT 1 FROM pc_parts WHERE id = 726);

-- Ensure the pc_parts sequence is ahead of all existing IDs
SELECT setval('pc_parts_id_seq', GREATEST(
    (SELECT COALESCE(MAX(id), 0) FROM pc_parts),
    (SELECT last_value FROM pc_parts_id_seq)
));

-- ==========================================================================
-- STEP 2: Add is_active column to component tables that lack it
-- ==========================================================================

-- cpu
ALTER TABLE cpu ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- gpu
ALTER TABLE gpu ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- motherboard
ALTER TABLE motherboard ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ram
ALTER TABLE ram ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- storage
ALTER TABLE storage ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- psu
ALTER TABLE psu ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- pc_case
ALTER TABLE pc_case ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- cooling
ALTER TABLE cooling ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- monitor
ALTER TABLE monitor ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- webcam
ALTER TABLE webcam ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ==========================================================================
-- STEP 3: Add FK constraints from component tables to pc_parts
-- These enforce the Table-Per-Type inheritance pattern that already exists
-- in practice (builder.js, enhanced-kiosk.js, stockController.js all JOIN
-- component.id = pc_parts.id).
-- ==========================================================================

-- cpu -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cpu_pc_parts' AND table_name = 'cpu'
    ) THEN
        ALTER TABLE cpu ADD CONSTRAINT fk_cpu_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- gpu -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_gpu_pc_parts' AND table_name = 'gpu'
    ) THEN
        ALTER TABLE gpu ADD CONSTRAINT fk_gpu_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- motherboard -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_motherboard_pc_parts' AND table_name = 'motherboard'
    ) THEN
        ALTER TABLE motherboard ADD CONSTRAINT fk_motherboard_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- ram -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ram_pc_parts' AND table_name = 'ram'
    ) THEN
        ALTER TABLE ram ADD CONSTRAINT fk_ram_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- storage -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_storage_pc_parts' AND table_name = 'storage'
    ) THEN
        ALTER TABLE storage ADD CONSTRAINT fk_storage_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- psu -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_psu_pc_parts' AND table_name = 'psu'
    ) THEN
        ALTER TABLE psu ADD CONSTRAINT fk_psu_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- pc_case -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pc_case_pc_parts' AND table_name = 'pc_case'
    ) THEN
        ALTER TABLE pc_case ADD CONSTRAINT fk_pc_case_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- cooling -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cooling_pc_parts' AND table_name = 'cooling'
    ) THEN
        ALTER TABLE cooling ADD CONSTRAINT fk_cooling_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- monitor -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_monitor_pc_parts' AND table_name = 'monitor'
    ) THEN
        ALTER TABLE monitor ADD CONSTRAINT fk_monitor_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- webcam -> pc_parts
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_webcam_pc_parts' AND table_name = 'webcam'
    ) THEN
        ALTER TABLE webcam ADD CONSTRAINT fk_webcam_pc_parts 
            FOREIGN KEY (id) REFERENCES pc_parts(id) ON UPDATE CASCADE;
    END IF;
END $$;

-- ==========================================================================
-- STEP 4: Rename dead/empty tables with _deprecated_ prefix
-- These tables have 0 rows and 0 active application code references.
-- ==========================================================================

-- monitors (0 rows, 0 app refs — superseded by monitor + pc_parts)
ALTER TABLE IF EXISTS monitors RENAME TO _deprecated_monitors;

-- webcams (0 rows, 0 app refs — superseded by webcam + pc_parts)
ALTER TABLE IF EXISTS webcams RENAME TO _deprecated_webcams;

-- "user" table (0 rows, only users table is used by app code)
ALTER TABLE IF EXISTS "user" RENAME TO _deprecated_user;

-- ==========================================================================
-- STEP 5: Create backward-compatible views for renamed tables
-- Prevents any straggling references from hard-failing.
-- ==========================================================================

CREATE OR REPLACE VIEW monitors AS SELECT * FROM _deprecated_monitors;
CREATE OR REPLACE VIEW webcams AS SELECT * FROM _deprecated_webcams;
CREATE OR REPLACE VIEW "user" AS SELECT * FROM _deprecated_user;

-- ==========================================================================
-- STEP 6: Add table comments for documentation
-- ==========================================================================

-- Document the Table-Per-Type pattern
COMMENT ON TABLE cpu IS 'CPU specifications — child of pc_parts (Table-Per-Type). FK: cpu.id -> pc_parts.id';
COMMENT ON TABLE gpu IS 'GPU specifications — child of pc_parts (Table-Per-Type). FK: gpu.id -> pc_parts.id';
COMMENT ON TABLE motherboard IS 'Motherboard specifications — child of pc_parts (Table-Per-Type). FK: motherboard.id -> pc_parts.id';
COMMENT ON TABLE ram IS 'RAM specifications — child of pc_parts (Table-Per-Type). FK: ram.id -> pc_parts.id';
COMMENT ON TABLE storage IS 'Storage specifications — child of pc_parts (Table-Per-Type). FK: storage.id -> pc_parts.id';
COMMENT ON TABLE psu IS 'PSU specifications — child of pc_parts (Table-Per-Type). FK: psu.id -> pc_parts.id';
COMMENT ON TABLE pc_case IS 'Case specifications — child of pc_parts (Table-Per-Type). FK: pc_case.id -> pc_parts.id';
COMMENT ON TABLE cooling IS 'Cooling specifications — child of pc_parts (Table-Per-Type). FK: cooling.id -> pc_parts.id';
COMMENT ON TABLE monitor IS 'Monitor specifications — child of pc_parts (Table-Per-Type). FK: monitor.id -> pc_parts.id';
COMMENT ON TABLE webcam IS 'Webcam specifications — child of pc_parts (Table-Per-Type). FK: webcam.id -> pc_parts.id';
COMMENT ON TABLE pc_parts IS 'Master product catalog — parent table in Table-Per-Type pattern. Children: cpu, gpu, motherboard, ram, storage, psu, pc_case, cooling, monitor, webcam';

-- Document settings separation
COMMENT ON TABLE settings IS 'Application display/format settings (theme, currency, date_format, notifications). Managed via Settings model and /api/settings routes.';
COMMENT ON TABLE system_settings IS 'System-level and per-user settings (security, api_rate_limit, session_timeout, per-user appearance/language). Managed via /api/admin routes.';

-- Document deprecated tables
COMMENT ON TABLE _deprecated_monitors IS 'DEPRECATED: Empty table, superseded by monitor + pc_parts. Renamed 2025-01-13. View "monitors" provides backward compat.';
COMMENT ON TABLE _deprecated_webcams IS 'DEPRECATED: Empty table, superseded by webcam + pc_parts. Renamed 2025-01-13. View "webcams" provides backward compat.';
COMMENT ON TABLE _deprecated_user IS 'DEPRECATED: Empty legacy table, superseded by users. Renamed 2025-01-13. View "user" provides backward compat.';

-- ==========================================================================
-- STEP 7: Record migration
-- ==========================================================================

INSERT INTO _migration_history (migration_name, description)
VALUES (
    '002_schema_consolidation',
    'Added FK constraints (10 component tables -> pc_parts), added is_active to component tables, renamed 3 dead tables (_deprecated_*), created backward-compatible views, added table comments'
);

COMMIT;
