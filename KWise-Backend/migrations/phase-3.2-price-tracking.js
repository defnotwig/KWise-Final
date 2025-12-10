/**
 * Phase 3.2 - Price Tracking System Migration
 * Creates necessary tables and indexes for price history tracking
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

async function runMigration() {
    console.log(`\n${colors.cyan}${colors.bright}════════════════════════════════════════════════════════════════`);
    console.log(`  Phase 3.2 - Price Tracking System Migration`);
    console.log(`════════════════════════════════════════════════════════════════${colors.reset}\n`);

    try {
        // 1. Check if price_history table exists and update it
        console.log(`${colors.bright}1. Updating price_history table schema...${colors.reset}`);
        
        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'price_history'
            ) as exists;
        `);

        if (tableCheck.rows[0].exists) {
            // Table exists, add missing columns
            console.log(`${colors.yellow}   Table exists, adding missing columns...${colors.reset}`);
            
            // Add previous_price if it doesn't exist
            await pool.query(`
                ALTER TABLE price_history 
                ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);
            `);
            
            // Add price_change if it doesn't exist
            await pool.query(`
                ALTER TABLE price_history 
                ADD COLUMN IF NOT EXISTS price_change DECIMAL(10,2);
            `);
            
            // Add price_change_percent if it doesn't exist
            await pool.query(`
                ALTER TABLE price_history 
                ADD COLUMN IF NOT EXISTS price_change_percent DECIMAL(5,2);
            `);
            
            // Add created_by if it doesn't exist
            await pool.query(`
                ALTER TABLE price_history 
                ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
            `);
            
            // Add constraints
            await pool.query(`
                ALTER TABLE price_history 
                DROP CONSTRAINT IF EXISTS price_positive;
            `);
            await pool.query(`
                ALTER TABLE price_history 
                ADD CONSTRAINT price_positive CHECK (price >= 0);
            `);
            
            await pool.query(`
                ALTER TABLE price_history 
                DROP CONSTRAINT IF EXISTS previous_price_positive;
            `);
            await pool.query(`
                ALTER TABLE price_history 
                ADD CONSTRAINT previous_price_positive CHECK (previous_price IS NULL OR previous_price >= 0);
            `);
            
            console.log(`${colors.green}✅ price_history table updated${colors.reset}\n`);
        } else {
            // Create new table
            await pool.query(`
                CREATE TABLE price_history (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES pc_parts(id) ON DELETE CASCADE,
                    price DECIMAL(10,2) NOT NULL,
                    previous_price DECIMAL(10,2),
                    price_change DECIMAL(10,2),
                    price_change_percent DECIMAL(5,2),
                    source VARCHAR(50) DEFAULT 'manual',
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER REFERENCES users(id),
                    notes TEXT,
                    CONSTRAINT price_positive CHECK (price >= 0),
                    CONSTRAINT previous_price_positive CHECK (previous_price IS NULL OR previous_price >= 0)
                );
            `);
            console.log(`${colors.green}✅ price_history table created${colors.reset}\n`);
        }

        // 2. Create indexes for price_history
        console.log(`${colors.bright}2. Creating price_history indexes...${colors.reset}`);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_price_history_product_date 
            ON price_history(product_id, recorded_at DESC);
        `);
        console.log(`${colors.green}   ✅ idx_price_history_product_date${colors.reset}`);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at 
            ON price_history(recorded_at DESC);
        `);
        console.log(`${colors.green}   ✅ idx_price_history_recorded_at${colors.reset}`);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_price_history_price_change 
            ON price_history(price_change DESC) 
            WHERE price_change IS NOT NULL AND ABS(price_change) > 0;
        `);
        console.log(`${colors.green}   ✅ idx_price_history_price_change${colors.reset}\n`);

        // 3. Create price_alerts table
        console.log(`${colors.bright}3. Creating price_alerts table...${colors.reset}`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS price_alerts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES pc_parts(id) ON DELETE CASCADE,
                target_price DECIMAL(10,2) NOT NULL,
                condition VARCHAR(20) DEFAULT 'less_than',
                percentage_drop DECIMAL(5,2),
                is_active BOOLEAN DEFAULT true,
                triggered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT target_price_positive CHECK (target_price >= 0),
                CONSTRAINT valid_condition CHECK (condition IN ('less_than', 'greater_than', 'drops_by', 'increases_by')),
                CONSTRAINT unique_active_alert UNIQUE(user_id, product_id, is_active)
            );
        `);
        console.log(`${colors.green}✅ price_alerts table created${colors.reset}\n`);

        // 4. Create indexes for price_alerts
        console.log(`${colors.bright}4. Creating price_alerts indexes...${colors.reset}`);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active 
            ON price_alerts(user_id, is_active) 
            WHERE is_active = true;
        `);
        console.log(`${colors.green}   ✅ idx_price_alerts_user_active${colors.reset}`);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_price_alerts_product_active 
            ON price_alerts(product_id, is_active) 
            WHERE is_active = true;
        `);
        console.log(`${colors.green}   ✅ idx_price_alerts_product_active${colors.reset}\n`);

        // 5. Create trigger function for automatic price tracking
        console.log(`${colors.bright}5. Creating automatic price tracking trigger...${colors.reset}`);
        await pool.query(`
            CREATE OR REPLACE FUNCTION log_price_change()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Only log if price actually changed
                IF OLD.price IS DISTINCT FROM NEW.price THEN
                    INSERT INTO price_history (
                        product_id, 
                        price, 
                        previous_price, 
                        price_change, 
                        price_change_percent,
                        source,
                        created_by
                    ) VALUES (
                        NEW.id,
                        NEW.price,
                        OLD.price,
                        NEW.price - OLD.price,
                        CASE 
                            WHEN OLD.price = 0 THEN 100
                            ELSE ((NEW.price - OLD.price) / OLD.price * 100)::numeric(5,2)
                        END,
                        'auto_trigger',
                        NEW.updated_by
                    );
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log(`${colors.green}✅ log_price_change() function created${colors.reset}\n`);

        // 6. Create trigger on pc_parts table
        console.log(`${colors.bright}6. Attaching trigger to pc_parts table...${colors.reset}`);
        await pool.query(`
            DROP TRIGGER IF EXISTS price_change_trigger ON pc_parts;
        `);
        await pool.query(`
            CREATE TRIGGER price_change_trigger
            AFTER UPDATE ON pc_parts
            FOR EACH ROW
            EXECUTE FUNCTION log_price_change();
        `);
        console.log(`${colors.green}✅ price_change_trigger attached${colors.reset}\n`);

        // 7. Populate initial price history from current prices
        console.log(`${colors.bright}7. Populating initial price history...${colors.reset}`);
        const result = await pool.query(`
            INSERT INTO price_history (product_id, price, source, notes)
            SELECT id, price, 'initial_migration', 'Initial price recorded during Phase 3.2 migration'
            FROM pc_parts
            WHERE is_active = true AND price > 0
            ON CONFLICT DO NOTHING
            RETURNING id;
        `);
        console.log(`${colors.green}✅ Inserted ${result.rowCount} initial price records${colors.reset}\n`);

        // 8. Create function to check and trigger price alerts
        console.log(`${colors.bright}8. Creating price alert check function...${colors.reset}`);
        await pool.query(`
            CREATE OR REPLACE FUNCTION check_price_alerts(p_product_id INTEGER, p_new_price DECIMAL)
            RETURNS TABLE(alert_id INTEGER, user_id INTEGER, condition VARCHAR, target_price DECIMAL) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    pa.id,
                    pa.user_id,
                    pa.condition,
                    pa.target_price
                FROM price_alerts pa
                WHERE pa.product_id = p_product_id
                    AND pa.is_active = true
                    AND (
                        (pa.condition = 'less_than' AND p_new_price <= pa.target_price) OR
                        (pa.condition = 'greater_than' AND p_new_price >= pa.target_price)
                    );
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log(`${colors.green}✅ check_price_alerts() function created${colors.reset}\n`);

        // 9. Create additional helpful indexes
        console.log(`${colors.bright}9. Creating additional performance indexes...${colors.reset}`);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_created_status 
            ON orders(created_at DESC, status);
        `);
        console.log(`${colors.green}   ✅ idx_orders_created_status${colors.reset}`);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_pc_parts_is_active 
            ON pc_parts(is_active) 
            WHERE is_active = true;
        `);
        console.log(`${colors.green}   ✅ idx_pc_parts_is_active${colors.reset}`);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_pc_parts_category_active 
            ON pc_parts(category, is_active) 
            WHERE is_active = true;
        `);
        console.log(`${colors.green}   ✅ idx_pc_parts_category_active${colors.reset}\n`);

        // 10. Verify migration
        console.log(`${colors.bright}10. Verifying migration...${colors.reset}`);
        
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
                AND table_name IN ('price_history', 'price_alerts')
            ORDER BY table_name;
        `);
        console.log(`${colors.green}   ✅ Tables created: ${tables.rows.map(r => r.table_name).join(', ')}${colors.reset}`);

        const indexes = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
                AND indexname LIKE 'idx_price_%'
            ORDER BY indexname;
        `);
        console.log(`${colors.green}   ✅ Indexes created: ${indexes.rowCount} price-related indexes${colors.reset}`);

        const historyCount = await pool.query('SELECT COUNT(*) FROM price_history');
        console.log(`${colors.green}   ✅ Price history records: ${historyCount.rows[0].count}${colors.reset}\n`);

        console.log(`${colors.green}${colors.bright}════════════════════════════════════════════════════════════════`);
        console.log(`  ✅ Phase 3.2 Price Tracking Migration Complete!`);
        console.log(`════════════════════════════════════════════════════════════════${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.red}${colors.bright}Migration Error:${colors.reset}`, error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
runMigration().catch(console.error);
