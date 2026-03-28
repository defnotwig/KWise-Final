-- ============================================================================
-- K-WISE COMPATIBILITY SYSTEM - PERFORMANCE OPTIMIZATION
-- Migration 020: Add JSON indexes and optimize query performance
-- Date: November 13, 2025
-- Target: < 10ms compatibility rule queries, 70%+ cache hit rate
-- ============================================================================

-- ============================================================================
-- 1. JSON (GIN) INDEXES FOR JSONB COLUMNS
-- ============================================================================

-- Create GIN index on compatibility_rules.rule_expression (JSONB)
-- Enables fast queries on rule conditions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compatibility_rules_expression_gin 
ON compatibility_rules USING GIN (rule_expression);

-- Create GIN index on pc_parts.specifications (JSONB)
-- Enables fast specification lookups for compatibility checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pc_parts_specifications_gin 
ON pc_parts USING GIN (specifications);

COMMENT ON INDEX idx_compatibility_rules_expression_gin IS 'GIN index for fast JSONB rule_expression queries';
COMMENT ON INDEX idx_pc_parts_specifications_gin IS 'GIN index for fast JSONB specifications queries';

-- ============================================================================
-- 2. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for querying rules by category + enabled status (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_category_enabled 
ON compatibility_rules (rule_category, enabled) WHERE enabled = true;

-- Index for querying rules by component pair
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_component_pair 
ON compatibility_rules (component_a_category, component_b_category, enabled) WHERE enabled = true;

-- Index for querying rules by priority (for ordered results)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_priority_category 
ON compatibility_rules (priority DESC, rule_category) WHERE enabled = true;

-- Index for querying rules by severity (for filtering critical vs warning)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_severity_enabled 
ON compatibility_rules (severity, enabled) WHERE enabled = true;

COMMENT ON INDEX idx_compat_category_enabled IS 'Composite index for rule_category + enabled queries';
COMMENT ON INDEX idx_compat_component_pair IS 'Composite index for component pair compatibility lookups';
COMMENT ON INDEX idx_compat_priority_category IS 'Composite index for priority-ordered rule queries';
COMMENT ON INDEX idx_compat_severity_enabled IS 'Composite index for severity-filtered queries';

-- ============================================================================
-- 3. OPTIMIZE PC_PARTS TABLE INDEXES
-- ============================================================================

-- Add index on category + status (for filtering available products)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pc_parts_category_status 
ON pc_parts (category, status) WHERE status = 'available';

-- Add index on price (for sorting/filtering by price)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pc_parts_price 
ON pc_parts (price) WHERE status = 'available';

-- Add index on name for search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pc_parts_name_trgm 
ON pc_parts USING GIN (name gin_trgm_ops);

COMMENT ON INDEX idx_pc_parts_category_status IS 'Composite index for category + status filtering';
COMMENT ON INDEX idx_pc_parts_price IS 'Index for price-based sorting and filtering';
COMMENT ON INDEX idx_pc_parts_name_trgm IS 'Trigram index for fast name search queries';

-- ============================================================================
-- 4. MATERIALIZED VIEW FOR COMPATIBILITY SUMMARY
-- ============================================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS compatibility_summary CASCADE;

-- Create materialized view for frequently accessed compatibility stats
CREATE MATERIALIZED VIEW compatibility_summary AS
SELECT 
    component_a_category,
    component_b_category,
    rule_category,
    COUNT(*) as rule_count,
    COUNT(*) FILTER (WHERE severity = 'error') as critical_rules,
    COUNT(*) FILTER (WHERE severity = 'warning') as warning_rules,
    COUNT(*) FILTER (WHERE severity = 'info') as info_rules,
    ROUND(AVG(priority)::numeric, 2) as avg_priority,
    MIN(created_at) as oldest_rule,
    MAX(created_at) as newest_rule
FROM compatibility_rules
WHERE enabled = true
GROUP BY component_a_category, component_b_category, rule_category;

-- Create index on materialized view
CREATE INDEX idx_compat_summary_component_pair 
ON compatibility_summary (component_a_category, component_b_category);

CREATE INDEX idx_compat_summary_category 
ON compatibility_summary (rule_category);

COMMENT ON MATERIALIZED VIEW compatibility_summary IS 'Pre-computed compatibility statistics for fast queries';

-- ============================================================================
-- 5. REFRESH MATERIALIZED VIEW FUNCTION
-- ============================================================================

-- Create function to refresh compatibility_summary
CREATE OR REPLACE FUNCTION refresh_compatibility_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY compatibility_summary;
    RAISE NOTICE 'Compatibility summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_compatibility_summary IS 'Refresh compatibility_summary materialized view';

-- ============================================================================
-- 6. OPTIMIZE COMPATIBILITY_MATRIX TABLE
-- ============================================================================

-- Ensure compatibility_matrix table exists
CREATE TABLE IF NOT EXISTS compatibility_matrix (
    id SERIAL PRIMARY KEY,
    product_a_id INTEGER NOT NULL,
    product_b_id INTEGER NOT NULL,
    compatibility_score INTEGER NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    compatible BOOLEAN NOT NULL,
    critical_issues JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_a_id, product_b_id)
);

-- Create indexes for fast matrix lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_product_a 
ON compatibility_matrix (product_a_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_product_b 
ON compatibility_matrix (product_b_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_score 
ON compatibility_matrix (compatibility_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_compatible 
ON compatibility_matrix (compatible) WHERE compatible = true;

-- Create GIN indexes for JSONB arrays
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_issues_gin 
ON compatibility_matrix USING GIN (critical_issues);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compat_matrix_warnings_gin 
ON compatibility_matrix USING GIN (warnings);

COMMENT ON TABLE compatibility_matrix IS 'Pre-computed compatibility scores for component pairs';
COMMENT ON INDEX idx_compat_matrix_product_a IS 'Index for product_a lookups';
COMMENT ON INDEX idx_compat_matrix_product_b IS 'Index for product_b lookups';
COMMENT ON INDEX idx_compat_matrix_score IS 'Index for score-based sorting';
COMMENT ON INDEX idx_compat_matrix_compatible IS 'Partial index for compatible pairs only';

-- ============================================================================
-- 7. VACUUM AND ANALYZE
-- ============================================================================

-- Update statistics for query planner
ANALYZE compatibility_rules;
ANALYZE pc_parts;
ANALYZE compatibility_matrix;
ANALYZE compatibility_summary;

-- ============================================================================
-- 8. VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('compatibility_rules', 'pc_parts', 'compatibility_matrix')
ORDER BY tablename, indexname;

-- Check compatibility_summary row count
SELECT 
    'compatibility_summary' as view_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT component_a_category) as unique_categories_a,
    COUNT(DISTINCT component_b_category) as unique_categories_b,
    SUM(rule_count) as total_rules
FROM compatibility_summary;

-- Check compatibility_rules performance
SELECT 
    'compatibility_rules' as table_name,
    COUNT(*) as total_rules,
    COUNT(*) FILTER (WHERE enabled = true) as enabled_rules,
    COUNT(DISTINCT rule_category) as categories,
    COUNT(DISTINCT component_a_category) as component_types,
    pg_size_pretty(pg_total_relation_size('compatibility_rules')) as table_size
FROM compatibility_rules;

-- Check compatibility_matrix size
SELECT 
    'compatibility_matrix' as table_name,
    COUNT(*) as pre_computed_pairs,
    COUNT(*) FILTER (WHERE compatible = true) as compatible_pairs,
    ROUND(AVG(compatibility_score)::numeric, 2) as avg_score,
    pg_size_pretty(pg_total_relation_size('compatibility_matrix')) as table_size
FROM compatibility_matrix;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 
    '✅ Migration 020: Compatibility Indexes Optimization' as status,
    NOW() as completed_at,
    'Performance target: < 10ms rule queries, 70%+ cache hit rate' as target;
