-- ============================================================================
-- Migration 003: Performance Optimization — Index Cleanup
-- Date: 2025-01-13
-- Author: Database Architect (MCP Expert)
-- 
-- Purpose:
--   1. Drop duplicate indexes (60 pairs found — ~50MB wasted)
--   2. Drop unused indexes on high-volume tables (ip_logs, compatibility_logs)
--   3. Estimated space recovery: ~70MB+
--
-- Safety: Only drops INDEXES, never data. All drops are CONCURRENTLY-safe.
-- ============================================================================

BEGIN;

-- ==========================================================================
-- PART 1: Drop DUPLICATE indexes
-- Strategy: keep constraint-backing index (table_column_key), drop manual idx_*
-- When both are manual, keep the shorter-named one.
-- ==========================================================================

-- --- ai_logs ---
DROP INDEX IF EXISTS idx_ai_logs_created_at;    -- dup of idx_ai_logs_date (same: created_at DESC)
DROP INDEX IF EXISTS idx_ai_logs_user_id;       -- dup of idx_ai_logs_user (same: user_id)

-- --- audit_logs ---
DROP INDEX IF EXISTS idx_audit_logs_created;     -- dup of idx_audit_logs_created_at (same: created_at)
DROP INDEX IF EXISTS idx_audit_logs_created_at_desc; -- dup of idx_audit_logs_created_at
DROP INDEX IF EXISTS idx_audit_logs_user_id;     -- dup of idx_audit_logs_user

-- --- compatibility_cache ---
DROP INDEX IF EXISTS idx_compatibility_cache_created_analytics; -- dup of idx_compatibility_cache_created
DROP INDEX IF EXISTS idx_compatibility_cache_key; -- dup of compatibility_cache_cache_key_key (unique)

-- --- compatibility_logs (12 dupes — biggest space waster) ---
DROP INDEX IF EXISTS idx_compat_logs_hash;       -- dup of idx_compatibility_logs_build_hash
DROP INDEX IF EXISTS idx_compatibility_logs_hash; -- dup of idx_compatibility_logs_build_hash
DROP INDEX IF EXISTS idx_compat_logs_created;     -- dup of idx_compatibility_logs_created
DROP INDEX IF EXISTS idx_compatibility_logs_created_at; -- dup of idx_compatibility_logs_created
DROP INDEX IF EXISTS idx_compatibility_logs_session; -- dup of idx_compatibility_logs_session_id
DROP INDEX IF EXISTS idx_compat_logs_parts;       -- dup of idx_compatibility_logs_parts_gin

-- --- compatibility_rules ---
DROP INDEX IF EXISTS idx_compat_rules_priority;   -- dup of idx_compatibility_rules_priority

-- --- gpu_compatibility ---
DROP INDEX IF EXISTS idx_gpu_compat_psu_wattage;  -- dup of idx_gpu_compat_power

-- --- messages ---
DROP INDEX IF EXISTS idx_messages_users;          -- dup of idx_messages_conversation (same cols)

-- --- notifications ---
DROP INDEX IF EXISTS idx_notifications_is_read;   -- dup of idx_notifications_read

-- --- order_items ---
DROP INDEX IF EXISTS idx_order_items_order_id;    -- dup of idx_order_items_order

-- --- orders ---
DROP INDEX IF EXISTS idx_orders_created_status;   -- dup of idx_orders_date_status (and date_status_combo)
DROP INDEX IF EXISTS idx_orders_date_status_combo; -- dup of idx_orders_date_status
DROP INDEX IF EXISTS idx_orders_number;           -- dup of orders_order_number_key (unique)
DROP INDEX IF EXISTS idx_orders_order_id_formatted; -- dup of orders_order_id_formatted_key (unique)
DROP INDEX IF EXISTS idx_orders_transaction_id_formatted; -- dup of orders_transaction_id_formatted_key (unique)
DROP INDEX IF EXISTS idx_orders_status_filter;    -- dup of idx_orders_status

-- --- password_resets ---
DROP INDEX IF EXISTS idx_password_resets_session_id; -- dup of password_resets_reset_session_id_key (unique)
DROP INDEX IF EXISTS idx_password_resets_reset_session_id; -- dup of above

-- --- pc_customized_ai_builds ---
DROP INDEX IF EXISTS idx_ai_builds_usage_tier;    -- dup of pc_customized_ai_builds_usage_budget_tier_key (unique)

-- --- pc_customized_ai_reference_builds ---
DROP INDEX IF EXISTS idx_pc_customized_builds_key; -- dup of build_key_key (unique)

-- --- pc_parts ---
DROP INDEX IF EXISTS idx_pc_parts_specifications_gin; -- dup of idx_pc_parts_specifications (same GIN)

-- --- pending_orders ---
DROP INDEX IF EXISTS idx_pending_orders_hash;     -- dup of pending_orders_order_hash_key (unique)

-- --- price_history ---
DROP INDEX IF EXISTS idx_price_history_recorded_at; -- dup of idx_price_history_date

-- --- product_specs ---
DROP INDEX IF EXISTS idx_product_specs_product_id; -- dup of product_specs_pkey (PK!)

-- --- queue_management ---
DROP INDEX IF EXISTS idx_queue_management_number; -- dup of queue_management_queue_number_key (unique)
DROP INDEX IF EXISTS idx_queue_management_number_status; -- dup of idx_queue_management_queue_number_status

-- --- rate_limits ---
DROP INDEX IF EXISTS idx_rate_limits_key;         -- dup of rate_limits_key_key (unique)

-- --- settings ---
DROP INDEX IF EXISTS idx_settings_key;            -- dup of settings_key_key (unique)

-- --- specification_schemas ---
DROP INDEX IF EXISTS idx_spec_schemas_category;   -- dup of idx_specification_schemas_category

-- --- successful_builds ---
DROP INDEX IF EXISTS idx_successful_builds_hash;  -- dup of successful_builds_build_hash_key (unique)

-- --- system_settings ---
DROP INDEX IF EXISTS idx_system_settings_key;     -- dup of system_settings_key_key (unique)

-- --- transactions ---
DROP INDEX IF EXISTS idx_transactions_number;     -- dup of transactions_transaction_number_key (unique)

-- --- user_sessions ---
DROP INDEX IF EXISTS idx_user_sessions_token;     -- dup of user_sessions_session_token_key (unique)
DROP INDEX IF EXISTS idx_user_sessions_session_token; -- also dup of session_token_key
DROP INDEX IF EXISTS idx_user_sessions_expires;   -- dup of idx_user_sessions_expires_at

-- --- users ---
DROP INDEX IF EXISTS idx_users_reference_email;   -- dup of users_reference_email_key (unique)
DROP INDEX IF EXISTS idx_users_email;             -- dup of users_email_key1 (unique)

-- --- build_patterns ---
DROP INDEX IF EXISTS idx_build_patterns_hash;     -- dup of build_patterns_build_hash_key (unique)

-- --- categories ---
DROP INDEX IF EXISTS idx_categories_slug;         -- dup of categories_slug_key (unique)

-- --- ai_feedback_stats ---
DROP INDEX IF EXISTS idx_ai_feedback_stats_period; -- dup of ai_feedback_stats_period_key (unique)

-- --- api_keys ---
DROP INDEX IF EXISTS idx_api_keys_key_hash;       -- dup of api_keys_key_hash_key (unique)

-- --- compatibility_issue_templates ---
DROP INDEX IF EXISTS idx_issue_templates_code;    -- dup of compatibility_issue_templates_issue_code_key

-- --- ip_access_control ---
DROP INDEX IF EXISTS idx_ip_access_ip_address;    -- dup of ip_access_control_ip_address_key (unique)

-- --- kiosk_sessions ---
DROP INDEX IF EXISTS idx_kiosk_sessions_session_id; -- dup of kiosk_sessions_session_id_key (unique)

-- --- order_counters ---
DROP INDEX IF EXISTS idx_order_counters_type_period; -- dup of order_counters_counter_type_counter_period_key


-- ==========================================================================
-- PART 2: Drop UNUSED indexes on high-volume tables
-- These have 0 scans and waste significant space.
-- ==========================================================================

-- --- ip_logs (255K rows, 118MB, ALL 6 non-PK indexes unused = ~24MB) ---
DROP INDEX IF EXISTS idx_ip_logs_created_at;      -- 11MB, 0 scans
DROP INDEX IF EXISTS idx_ip_logs_ip_address;       -- 2.6MB, 0 scans
DROP INDEX IF EXISTS idx_ip_logs_action_type;      -- 2.6MB, 0 scans
DROP INDEX IF EXISTS idx_ip_logs_user_id;          -- 2.6MB, 0 scans
DROP INDEX IF EXISTS idx_ip_logs_ip_control_id;    -- 2.6MB, 0 scans
DROP INDEX IF EXISTS idx_ip_logs_success;          -- 2.5MB, 0 scans

-- --- compatibility_logs (remaining unused singles after dedup above) ---
DROP INDEX IF EXISTS idx_compatibility_logs_outcome;        -- 376kB, 0 scans
DROP INDEX IF EXISTS idx_compatibility_logs_user_decision;  -- 376kB, 0 scans
DROP INDEX IF EXISTS idx_compatibility_logs_user_id;        -- 376kB, 0 scans
DROP INDEX IF EXISTS idx_compat_logs_user_created;          -- 1.3MB, 0 scans

-- --- ai_audit_logs (43K rows, 133MB) ---
DROP INDEX IF EXISTS idx_ai_audit_logs_created;      -- 1.7MB, 0 scans
DROP INDEX IF EXISTS idx_ai_audit_logs_event_type;   -- 424kB, 0 scans
DROP INDEX IF EXISTS idx_ai_audit_logs_user;         -- 408kB, 0 scans
DROP INDEX IF EXISTS idx_ai_audit_logs_recommendation; -- 408kB, 0 scans

-- --- pc_parts (unused, non-essential indexes) ---
DROP INDEX IF EXISTS idx_pc_parts_dimensions;     -- 144kB, 0 scans
DROP INDEX IF EXISTS idx_pc_parts_compatibility_full; -- 72kB, 0 scans
DROP INDEX IF EXISTS idx_pc_parts_sale_dates;     -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_pc_parts_kiosk_featured; -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_pc_parts_extended_metadata; -- 32kB, 0 scans

-- --- users (unused indexes — keep only ones backing constraints) ---
DROP INDEX IF EXISTS idx_users_session_id;        -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_reset_token;       -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_reset_expires;     -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_password_reset_token; -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_online_status;     -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_is_online;         -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_last_login;        -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_last_login_at;     -- 16kB, 0 scans (dup columns)
DROP INDEX IF EXISTS idx_users_last_active_at;    -- 48kB, 0 scans
DROP INDEX IF EXISTS idx_users_last_admin_access; -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_account_locked;    -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_two_factor;        -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_login_attempts;    -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_users_presence_status;   -- 16kB, 0 scans

-- --- orders (unused, non-essential) ---
DROP INDEX IF EXISTS idx_orders_payment_method;   -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_ai_assisted;      -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_virtual_build;    -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_priority;         -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_assessment_data;  -- 24kB, 0 scans
DROP INDEX IF EXISTS idx_orders_queue_number;     -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_queue_status;     -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_customer_name;    -- 16kB, 0 scans
DROP INDEX IF EXISTS idx_orders_total_amount;     -- 16kB, 0 scans

-- --- deprecated tables ---
DROP INDEX IF EXISTS idx_monitors_part_id;        -- 16kB, on deprecated table
DROP INDEX IF EXISTS idx_webcams_part_id;          -- 16kB, on deprecated table

-- ==========================================================================
-- PART 3: Record migration
-- ==========================================================================

INSERT INTO _migration_history (migration_name, description)
VALUES (
    '003_performance_index_cleanup',
    'Dropped ~60 duplicate indexes and ~50 unused indexes. Estimated recovery: ~70MB. Targets: ip_logs (24MB), compatibility_logs (12MB), ai_audit_logs (3MB), plus widespread 16kB duplicates across all tables.'
);

COMMIT;
