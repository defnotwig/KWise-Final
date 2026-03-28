-- ============================================================================
-- MIGRATION: Fix Queue Status Constraint to Include 'cancelled'
-- ============================================================================
-- Issue: queue_management_status_check constraint rejects 'cancelled' status
-- Symptom: 500 errors when cancelling orders (constraint violation)
-- Root Cause: Constraint only allows: available, assigned, processing, completed
-- Fix: Add 'cancelled' to allowed values
-- 
-- Author: GitHub Copilot (Claude Sonnet 4.5)
-- Date: 2025-11-14
-- Severity: CRITICAL
-- Rollback: Included at bottom (DROP + ADD old constraint)
-- ============================================================================

-- ============================================================================
-- FORWARD MIGRATION (UP)
-- ============================================================================

BEGIN;

-- Step 1: Drop existing constraint
ALTER TABLE queue_management 
DROP CONSTRAINT IF EXISTS queue_management_status_check;

-- Step 2: Add new constraint with 'cancelled' included
ALTER TABLE queue_management 
ADD CONSTRAINT queue_management_status_check
CHECK (status IN ('available', 'assigned', 'processing', 'completed', 'cancelled'));

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT queue_management_status_check ON queue_management IS
'Allowed queue statuses: available (not assigned), assigned (order created), processing (being served), completed (finished and released), cancelled (cancelled and released)';

-- Step 4: Verify no existing invalid data
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM queue_management
    WHERE status NOT IN ('available', 'assigned', 'processing', 'completed', 'cancelled');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Migration aborted: % rows have invalid status values. Please fix manually.', invalid_count;
    END IF;
    
    RAISE NOTICE '✅ Constraint validation passed: 0 invalid status values found';
END $$;

COMMIT;

-- Verification query
SELECT 
    COUNT(*) as total_queues,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_queues,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_queues,
    COUNT(CASE WHEN status NOT IN ('available', 'assigned', 'processing', 'completed', 'cancelled') THEN 1 END) as invalid_queues
FROM queue_management;

-- ============================================================================
-- ROLLBACK MIGRATION (DOWN)
-- ============================================================================

-- To rollback this migration, run:
/*
BEGIN;

-- WARNING: This will fail if any queues have status = 'cancelled'
-- You must first update those to 'completed' or 'available':
-- UPDATE queue_management SET status = 'completed' WHERE status = 'cancelled';

ALTER TABLE queue_management 
DROP CONSTRAINT IF EXISTS queue_management_status_check;

ALTER TABLE queue_management 
ADD CONSTRAINT queue_management_status_check
CHECK (status IN ('available', 'assigned', 'processing', 'completed'));

COMMENT ON CONSTRAINT queue_management_status_check ON queue_management IS
'Allowed queue statuses: available, assigned, processing, completed (ORIGINAL - no cancelled)';

COMMIT;
*/

-- ============================================================================
-- VALIDATION TESTS
-- ============================================================================

-- Test 1: Insert a cancelled queue (should succeed after migration)
/*
INSERT INTO queue_management (queue_number, status, order_id)
VALUES (100, 'cancelled', NULL)
RETURNING id, queue_number, status;

-- Cleanup test
DELETE FROM queue_management WHERE queue_number = 100;
*/

-- Test 2: Try invalid status (should fail)
/*
INSERT INTO queue_management (queue_number, status, order_id)
VALUES (100, 'invalid_status', NULL);
-- Expected: ERROR: new row violates check constraint
*/

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- Pre-deployment checks:
-- 1. Backup database: pg_dump -d KWiseDB -t queue_management > backup_queue_management.sql
-- 2. Verify no active transactions: SELECT * FROM pg_stat_activity WHERE datname = 'KWiseDB';
-- 3. Notify users of brief downtime (< 1 second for constraint change)

-- Post-deployment verification:
-- 1. Check constraint exists: \d queue_management
-- 2. Test cancel operation via API
-- 3. Monitor logs for constraint violations

-- Impact: 
-- - Duration: < 1 second (constraint modification is atomic)
-- - Downtime: None (constraint change doesn't block reads)
-- - Compatibility: Backward compatible (only adds allowed value)
-- - Risk: LOW (only expands constraint, doesn't restrict)
