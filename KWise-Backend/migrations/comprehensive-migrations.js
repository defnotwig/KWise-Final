const { query, connectDB } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Database Migrations for K-Wise Admin System
 * Ensures all required fields exist for comprehensive functionality
 */

async function runMigrations() {
    try {
        await connectDB();
        logger.info('Starting database migrations...');

        // 1. Ensure users table has status field
        try {
            await query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';
            `);
            logger.info('✅ Users status column ensured');
        } catch (error) {
            logger.warn('Users status column already exists or error:', error.message);
        }

        // 2. Create system_settings table for settings management
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) UNIQUE NOT NULL,
                    value TEXT,
                    description TEXT,
                    category VARCHAR(100) DEFAULT 'general',
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            logger.info('✅ System settings table created');
        } catch (error) {
            logger.warn('System settings table already exists:', error.message);
        }

        // 3. Create audit_logs table if it doesn't exist
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    action VARCHAR(100) NOT NULL,
                    entity VARCHAR(100),
                    entity_id INTEGER,
                    details JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    status VARCHAR(20) DEFAULT 'success',
                    description TEXT,
                    severity VARCHAR(20) DEFAULT 'info',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            logger.info('✅ Audit logs table created');
        } catch (error) {
            logger.warn('Audit logs table already exists:', error.message);
        }

        // 4. Create transactions table for transaction history
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER REFERENCES orders(id),
                    transaction_id VARCHAR(100) UNIQUE,
                    payment_method VARCHAR(50),
                    amount DECIMAL(10,2),
                    status VARCHAR(20) DEFAULT 'pending',
                    processed_at TIMESTAMPTZ,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            logger.info('✅ Transactions table created');
        } catch (error) {
            logger.warn('Transactions table already exists:', error.message);
        }

        // 5. Create user_sessions for real-time tracking
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    session_id VARCHAR(255) UNIQUE,
                    ip_address INET,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT true,
                    last_activity TIMESTAMPTZ DEFAULT NOW(),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    expires_at TIMESTAMPTZ
                );
            `);
            logger.info('✅ User sessions table created');
        } catch (error) {
            logger.warn('User sessions table already exists:', error.message);
        }

        // 6. Add indexes for performance
        try {
            await query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_pc_parts_stock ON pc_parts(stock);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
            await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);
            logger.info('✅ Performance indexes created');
        } catch (error) {
            logger.warn('Some indexes already exist:', error.message);
        }

        // 7. Insert default system settings
        try {
            await query(`
                INSERT INTO system_settings (key, value, description, category) VALUES
                ('app_theme', 'light', 'Default application theme', 'appearance'),
                ('app_language', 'en', 'Default application language', 'localization'),
                ('low_stock_threshold', '5', 'Low stock alert threshold', 'inventory'),
                ('session_timeout', '30', 'Session timeout in minutes', 'security'),
                ('backup_frequency', '24', 'Backup frequency in hours', 'maintenance'),
                ('enable_email_notifications', 'true', 'Enable email notifications', 'notifications'),
                ('max_login_attempts', '5', 'Maximum login attempts before lockout', 'security'),
                ('system_status', 'active', 'Overall system status', 'system')
                ON CONFLICT (key) DO NOTHING;
            `);
            logger.info('✅ Default system settings inserted');
        } catch (error) {
            logger.warn('Default settings already exist:', error.message);
        }

        // 8. Update users status based on recent activity
        try {
            await query(`
                UPDATE users SET 
                    status = CASE 
                        WHEN last_login >= NOW() - INTERVAL '1 hour' THEN 'online'
                        WHEN last_login >= NOW() - INTERVAL '1 day' THEN 'away'
                        ELSE 'offline'
                    END,
                    is_online = (last_login >= NOW() - INTERVAL '1 hour')
                WHERE last_login IS NOT NULL;
            `);
            logger.info('✅ User statuses updated based on activity');
        } catch (error) {
            logger.warn('Error updating user statuses:', error.message);
        }

        logger.info('🎉 All database migrations completed successfully!');
        return true;

    } catch (error) {
        logger.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migrations if called directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('✅ Migrations completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigrations };
