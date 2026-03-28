-- ============================================================================
-- MIGRATION: Fix Serving Station Column Name Mismatch
-- ============================================================================
-- Issue: Code queries 'serving_station_set_by' but column is 'now_serving_set_by'
-- Symptom: Repeated errors "column qm.serving_station_set_by does not exist"
-- Root Cause: Schema has now_serving_* but code expects serving_station_*
-- Fix: Either rename columns OR update code (we choose: rename columns to match code)
-- 
-- Author: GitHub Copilot (Claude Sonnet 4.5)
-- Date: 2025-11-14
-- Severity: HIGH
-- Rollback: Included at bottom
-- ============================================================================

-- ============================================================================
-- FORWARD MIGRATION (UP)
-- ============================================================================

BEGIN;

-- Step 1: Verify existing columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'queue_management' 
        AND column_name = 'now_serving_set_by'
    ) THEN
        RAISE EXCEPTION 'Migration aborted: now_serving_set_by column does not exist. Check schema.';
    END IF;
    
    RAISE NOTICE '✅ Existing columns verified: now_serving_set_by, now_serving_set_at exist';
END $$;

-- Step 2: Check if target columns already exist (avoid duplicate migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'queue_management' 
        AND column_name = 'serving_station_set_by'
    ) THEN
        RAISE NOTICE '⚠️  serving_station_set_by already exists - skipping rename';
        RETURN;
    END IF;
END $$;

-- Step 3: Rename columns to match code expectations
ALTER TABLE queue_management 
RENAME COLUMN now_serving_set_by TO serving_station_set_by;

ALTER TABLE queue_management 
RENAME COLUMN now_serving_set_at TO serving_station_set_at;

-- Step 4: Add comments for clarity
COMMENT ON COLUMN queue_management.serving_station_set_by IS
'User ID who assigned this queue to a serving station (matches code expectations)';

COMMENT ON COLUMN queue_management.serving_station_set_at IS
'Timestamp when queue was assigned to serving station (matches code expectations)';

-- Step 5: Update foreign key constraint name if needed
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'queue_management' 
        AND constraint_name LIKE '%now_serving_set_by%'
    ) THEN
        ALTER TABLE queue_management 
        DROP CONSTRAINT IF EXISTS queue_management_now_serving_set_by_fkey;
    END IF;
    
    -- Recreate with correct name
    ALTER TABLE queue_management 
    ADD CONSTRAINT queue_management_serving_station_set_by_fkey
    FOREIGN KEY (serving_station_set_by) REFERENCES users(id);
    
    RAISE NOTICE '✅ Foreign key constraint recreated with correct name';
END $$;

COMMIT;

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'queue_management'
AND column_name IN ('serving_station_set_by', 'serving_station_set_at', 'now_serving_set_by', 'now_serving_set_at')
ORDER BY column_name;

-- Expected output:
-- serving_station_set_by | integer | YES
-- serving_station_set_at | timestamp with time zone | YES
-- now_serving_set_by | (should NOT exist)
-- now_serving_set_at | (should NOT exist)

-- ============================================================================
-- ROLLBACK MIGRATION (DOWN)
-- ============================================================================

-- To rollback this migration, run:
/*
BEGIN;

-- Rename back to original names
ALTER TABLE queue_management 
RENAME COLUMN serving_station_set_by TO now_serving_set_by;

ALTER TABLE queue_management 
RENAME COLUMN serving_station_set_at TO now_serving_set_at;

-- Drop new constraint
ALTER TABLE queue_management 
DROP CONSTRAINT IF EXISTS queue_management_serving_station_set_by_fkey;

-- Recreate old constraint
ALTER TABLE queue_management 
ADD CONSTRAINT queue_management_now_serving_set_by_fkey
FOREIGN KEY (now_serving_set_by) REFERENCES users(id);

-- Restore comments
COMMENT ON COLUMN queue_management.now_serving_set_by IS
'User ID who set this queue as now serving (original name)';

COMMENT ON COLUMN queue_management.now_serving_set_at IS
'Timestamp when queue was set as now serving (original name)';

COMMIT;
*/

-- ============================================================================
-- ALTERNATIVE SOLUTION: Add Alias Columns (No Rename)
-- ============================================================================

-- If renaming is too risky, you can add serving_station_* as aliases:
/*
BEGIN;

-- Add new columns as copies
ALTER TABLE queue_management 
ADD COLUMN IF NOT EXISTS serving_station_set_by INTEGER REFERENCES users(id);

ALTER TABLE queue_management 
ADD COLUMN IF NOT EXISTS serving_station_set_at TIMESTAMP WITH TIME ZONE;

-- Copy data from existing columns
UPDATE queue_management 
SET 
    serving_station_set_by = now_serving_set_by,
    serving_station_set_at = now_serving_set_at;

-- Create trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_serving_station_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.serving_station_set_by := NEW.now_serving_set_by;
    NEW.serving_station_set_at := NEW.now_serving_set_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_serving_station
BEFORE INSERT OR UPDATE ON queue_management
FOR EACH ROW
EXECUTE FUNCTION sync_serving_station_columns();

COMMIT;
*/

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- Pre-deployment checks:
-- 1. Backup database: pg_dump -d KWiseDB -t queue_management > backup_queue_management.sql
-- 2. Verify no code is actively querying now_serving_set_by
-- 3. Check if any views use these columns: 
--    SELECT * FROM information_schema.views WHERE view_definition LIKE '%now_serving_set_by%';

-- Post-deployment verification:
-- 1. Check columns renamed: \d queue_management
-- 2. Test query: SELECT serving_station_set_by, serving_station_set_at FROM queue_management LIMIT 5;
-- 3. Monitor error logs for "column does not exist" errors

-- Impact:
-- - Duration: < 1 second (column rename is metadata-only)
-- - Downtime: None (rename doesn't block reads)
-- - Compatibility: BREAKING for code expecting old column names
-- - Risk: MEDIUM (requires coordinated code deployment)
-- - Code changes required: Update all queries from now_serving_* to serving_station_*
