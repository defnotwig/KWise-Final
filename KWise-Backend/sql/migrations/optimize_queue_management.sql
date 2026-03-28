-- =====================================================
-- Optimization Migration for Queue Management
-- Created: 2025-11-12
-- Purpose: Add indexes to improve queue query performance
-- =====================================================

-- Index for queue_number range queries (ensureQueueNumbers)
CREATE INDEX IF NOT EXISTS idx_queue_management_queue_number_range 
ON queue_management(queue_number) 
WHERE queue_number BETWEEN 1 AND 99;

-- Index for status filtering (frequently used in queue operations)
CREATE INDEX IF NOT EXISTS idx_queue_management_status 
ON queue_management(status) 
WHERE status IN ('available', 'in_use', 'reserved');

-- Composite index for queue number and status (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_queue_management_number_status 
ON queue_management(queue_number, status);

-- Index for order_counters lookup
CREATE INDEX IF NOT EXISTS idx_order_counters_type_period 
ON order_counters(counter_type, counter_period);

-- Index for orders table queue_number lookup
CREATE INDEX IF NOT EXISTS idx_orders_queue_number 
ON orders(queue_number) 
WHERE queue_number IS NOT NULL;

-- Index for orders table status for active orders
CREATE INDEX IF NOT EXISTS idx_orders_status_active 
ON orders(status) 
WHERE status IN ('pending', 'processing', 'confirmed');

-- Analyze tables to update statistics
ANALYZE queue_management;
ANALYZE order_counters;
ANALYZE orders;

-- Display index information
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('queue_management', 'order_counters', 'orders')
ORDER BY tablename, indexname;
