/**
 * Migration: Add pending_orders table for order deduplication
 * Purpose: Prevent duplicate orders when 2 tablets simultaneously create orders
 * Timestamp: 2025
 * Author: Gabriel Ludwig Rivera
 */

-- Create pending_orders table to track in-flight orders
CREATE TABLE IF NOT EXISTS pending_orders (
    id SERIAL PRIMARY KEY,
    order_hash VARCHAR(32) UNIQUE NOT NULL,
    order_data JSONB NOT NULL,
    order_id INTEGER, -- Link to created order once complete
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 minutes'),
    completed_at TIMESTAMP,
    CONSTRAINT pending_orders_status_check CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_orders_hash ON pending_orders(order_hash);
CREATE INDEX IF NOT EXISTS idx_pending_orders_expires ON pending_orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_created ON pending_orders(created_at);

-- Add comment for documentation
COMMENT ON TABLE pending_orders IS 'Tracks pending orders to prevent duplicates during concurrent order creation';
COMMENT ON COLUMN pending_orders.order_hash IS 'MD5 hash of order details (customer + items + total) used for deduplication';
COMMENT ON COLUMN pending_orders.order_data IS 'Full order data JSON for reference and debugging';
COMMENT ON COLUMN pending_orders.expires_at IS 'Expiration time - pending orders older than this are auto-cleaned';

-- Function to cleanup expired pending orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired pending orders (older than expires_at)
    -- FIX: Use GET DIAGNOSTICS instead of RETURNING COUNT(*) to avoid aggregate function error
    DELETE FROM pending_orders 
    WHERE expires_at < NOW();
    
    -- Get count of deleted rows using GET DIAGNOSTICS (PostgreSQL standard method)
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup if any rows deleted
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % expired pending orders', deleted_count;
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_pending_orders() IS 'Removes expired pending orders to prevent table bloat';

-- Function to check for duplicate order by hash
CREATE OR REPLACE FUNCTION check_duplicate_order(
    p_order_hash VARCHAR(32)
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_order_id INTEGER,
    existing_order_data JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM pending_orders WHERE order_hash = p_order_hash AND status = 'pending') AS is_duplicate,
        po.order_id,
        po.order_data,
        po.created_at
    FROM pending_orders po
    WHERE po.order_hash = p_order_hash 
    AND po.status = 'pending'
    AND po.expires_at > NOW()
    ORDER BY po.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_duplicate_order(VARCHAR) IS 'Checks if order hash already exists in pending orders (duplicate detection)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pending_orders TO postgres;
GRANT USAGE, SELECT ON SEQUENCE pending_orders_id_seq TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed: pending_orders table created successfully';
    RAISE NOTICE '   - Table: pending_orders (deduplication tracking)';
    RAISE NOTICE '   - Indexes: 4 indexes for performance';
    RAISE NOTICE '   - Functions: cleanup_expired_pending_orders(), check_duplicate_order()';
END
$$;
