-- =============================================
-- Migration 001: Fix Critical Issues
-- Date: 2026-03-28
-- Author: Database Architect
-- Description: Fix duplicate triggers, shared sequence conflicts, and data integrity issues
-- SAFETY: No data is deleted. Only structural fixes.
-- =============================================

BEGIN;

-- =============================================
-- 1. FIX DUPLICATE UPDATE TRIGGERS
-- These tables have two BEFORE UPDATE triggers that both update timestamps,
-- causing double execution. Remove the redundant update_timestamp() trigger
-- and keep the more commonly used update_updated_at_column() trigger.
-- =============================================

-- orders: has both update_orders_timestamp and update_orders_updated_at
DROP TRIGGER IF EXISTS update_orders_timestamp ON orders;

-- users: has both update_users_timestamp and update_users_updated_at
DROP TRIGGER IF EXISTS update_users_timestamp ON users;

-- settings: has both update_settings_timestamp and update_settings_updated_at
DROP TRIGGER IF EXISTS update_settings_timestamp ON settings;

-- transactions: has both update_transactions_timestamp and update_transactions_updated_at
DROP TRIGGER IF EXISTS update_transactions_timestamp ON transactions;

-- compatibility_rules: has both update_compatibility_rules_timestamp and rule_version_trigger
-- Keep rule_version_trigger (it records version history, more important)
-- The update_compatibility_rules_timestamp is redundant
DROP TRIGGER IF EXISTS update_compatibility_rules_timestamp ON compatibility_rules;

-- user_preferences: has both trigger_user_preferences_updated_at and trigger_validate_user_preferences
-- These are NOT duplicates - one updates timestamp, one validates. Keep both.
-- No action needed for user_preferences.

-- =============================================
-- 2. FIX SHARED SEQUENCE CONFLICT
-- The deprecated "user" table uses users_id_seq (same as "users" table).
-- Create a dedicated sequence for "user" table to prevent ID collisions.
-- =============================================

-- Create a new dedicated sequence for the old "user" table
CREATE SEQUENCE IF NOT EXISTS user_legacy_id_seq;

-- Set the new sequence to start after the max ID in the "user" table
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM public."user";
    IF max_id > 0 THEN
        PERFORM setval('user_legacy_id_seq', max_id);
    END IF;
END $$;

-- Alter the "user" table to use its own sequence
ALTER TABLE public."user" ALTER COLUMN id SET DEFAULT nextval('user_legacy_id_seq');

-- =============================================
-- 3. FIX ORPHANED/DUPLICATE SEQUENCES
-- Clean up sequences that reference non-existent columns
-- =============================================

-- monitors_id_seq1 is an orphaned duplicate - just note it exists
-- We'll handle this in Phase 2 when deprecating the monitors table
-- webcams_id_seq1 same situation

-- =============================================
-- 4. ADD MISSING NOT NULL CONSTRAINTS ON CRITICAL COLUMNS
-- =============================================

-- orders.status should never be null (it has a default but no NOT NULL in some paths)
-- Already NOT NULL per schema scan - confirmed

-- Ensure audit_logs.created_at is never null
ALTER TABLE audit_logs ALTER COLUMN created_at SET NOT NULL;

-- =============================================
-- 5. RECORD THIS MIGRATION
-- =============================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed'
);

INSERT INTO _migration_history (migration_name, description) 
VALUES ('001_fix_critical_issues', 'Fix duplicate triggers, shared sequence conflicts, and NOT NULL constraints')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;
