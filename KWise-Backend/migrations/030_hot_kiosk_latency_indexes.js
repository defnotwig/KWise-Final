/**
 * Additive indexes for local kiosk latency hardening.
 * No tables, columns, or data are dropped by this migration.
 */

const HOT_PATH_INDEXES = [
    `CREATE INDEX IF NOT EXISTS idx_queue_management_available_queue
        ON queue_management(status, queue_number)`,
    `CREATE INDEX IF NOT EXISTS idx_pending_orders_hash_status_expires
        ON pending_orders(order_hash, status, expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_status
        ON orders(created_at, status)`,
    `CREATE INDEX IF NOT EXISTS idx_ip_logs_created_at
        ON ip_logs(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_product_specs_product_id
        ON product_specs(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_specification_schemas_category_type_name
        ON specification_schemas(category, field_type, field_name)`,
    `CREATE INDEX IF NOT EXISTS idx_pc_parts_kiosk_category_name
        ON pc_parts(category, name)
        WHERE is_active = true AND COALESCE(kiosk_visible, true) = true`,
    `CREATE INDEX IF NOT EXISTS idx_pc_parts_kiosk_category_price
        ON pc_parts(category, price)
        WHERE is_active = true AND COALESCE(kiosk_visible, true) = true`,
    `CREATE INDEX IF NOT EXISTS idx_pc_parts_kiosk_category_stock
        ON pc_parts(category, stock)
        WHERE is_active = true AND COALESCE(kiosk_visible, true) = true`
];

const TRIGRAM_INDEXES = [
    `CREATE INDEX IF NOT EXISTS idx_pc_parts_name_trgm
        ON pc_parts USING GIN (name gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_pc_parts_brand_trgm
        ON pc_parts USING GIN (brand gin_trgm_ops)`
];

const DOWN_INDEXES = [
    'idx_pc_parts_brand_trgm',
    'idx_pc_parts_name_trgm',
    'idx_pc_parts_kiosk_category_stock',
    'idx_pc_parts_kiosk_category_price',
    'idx_pc_parts_kiosk_category_name',
    'idx_specification_schemas_category_type_name',
    'idx_product_specs_product_id',
    'idx_ip_logs_created_at',
    'idx_orders_created_status',
    'idx_pending_orders_hash_status_expires',
    'idx_queue_management_available_queue'
];

module.exports = {
    up: async (pool) => {
        console.log('Running migration 030: hot kiosk latency indexes...');

        for (const sql of HOT_PATH_INDEXES) {
            await pool.query(sql);
        }

        let trigramEnabled = false;
        try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            for (const sql of TRIGRAM_INDEXES) {
                await pool.query(sql);
            }
            trigramEnabled = true;
        } catch (error) {
            console.warn('pg_trgm search indexes skipped:', error.message);
        }

        console.log('Migration 030 completed successfully');
        return {
            success: true,
            message: 'Hot kiosk latency indexes ensured',
            trigramEnabled
        };
    },

    down: async (pool) => {
        console.log('Rolling back migration 030: hot kiosk latency indexes...');

        for (const indexName of DOWN_INDEXES) {
            await pool.query(`DROP INDEX IF EXISTS ${indexName}`);
        }

        console.log('Migration 030 rolled back successfully');
        return {
            success: true,
            message: 'Hot kiosk latency indexes removed'
        };
    }
};
