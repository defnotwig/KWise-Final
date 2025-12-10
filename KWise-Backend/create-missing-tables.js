const { query } = require('./config/db');
const logger = require('./utils/logger');

async function createMissingTables() {
    try {
        console.log('🔧 Creating missing database tables...');

        // Create system_settings table if it doesn't exist
        await query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) UNIQUE NOT NULL,
                value TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default settings
        const defaultSettings = [
            ['app_name', 'K-Wise Admin', 'Application name'],
            ['maintenance_mode', 'false', 'Enable/disable maintenance mode'],
            ['max_upload_size', '10MB', 'Maximum file upload size'],
            ['session_timeout', '3600', 'Session timeout in seconds'],
            ['backup_frequency', 'daily', 'Backup frequency setting'],
            ['email_notifications', 'true', 'Enable email notifications'],
            ['debug_mode', 'false', 'Enable debug logging'],
            ['api_rate_limit', '1000', 'API rate limit per hour'],
            ['theme', 'light', 'Default application theme'],
            ['language', 'en', 'Default application language']
        ];

        for (const [key, value, description] of defaultSettings) {
            await query(`
                INSERT INTO system_settings (key, value, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (key) DO NOTHING
            `, [key, value, description]);
        }

        console.log('✅ System settings table created and populated');

        // Ensure audit_logs has proper indexes for performance
        await query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
        `);

        console.log('✅ Audit logs indexes created');

        // Ensure users table has proper indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);

        console.log('✅ Users table indexes created');

        // Ensure orders table has proper indexes  
        await query(`
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
        `);

        console.log('✅ Orders table indexes created');

        console.log('🎉 All missing tables and indexes created successfully!');

    } catch (error) {
        console.error('❌ Error creating missing tables:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createMissingTables()
        .then(() => {
            console.log('✅ Database setup complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createMissingTables };
