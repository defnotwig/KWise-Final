/**
 * =====================================================
 * MIGRATION RUNNER - IP ACCESS CONTROL SYSTEM
 * =====================================================
 * Purpose: Run database migration for IP access control
 * Usage: node run-ip-migration.js
 * =====================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password'
});

async function runMigration() {
    console.log('🔒 Starting IP Access Control System Migration...\n');

    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ Connected to database at ${testResult.rows[0].current_time}\n`);

        // Read SQL migration file
        console.log('📂 Reading migration SQL file...');
        const sqlPath = path.join(__dirname, 'sql', 'ip-access-control-schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`✅ SQL file loaded (${sql.length} characters)\n`);

        // Execute migration
        console.log('🚀 Executing migration...');
        await pool.query(sql);
        console.log('✅ Migration executed successfully!\n');

        // Verify tables were created
        console.log('🔍 Verifying tables...');
        const tables = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'ip_%'
            ORDER BY tablename
        `);

        console.log('📋 Created tables:');
        tables.rows.forEach(row => {
            console.log(`   ✓ ${row.tablename}`);
        });
        console.log('');

        // Verify default data
        console.log('🔍 Verifying default localhost entries...');
        const defaultIPs = await pool.query(`
            SELECT ip_address, status, device_name 
            FROM ip_access_control 
            WHERE status = 'allowed'
        `);

        console.log('📋 Default allowed IPs:');
        defaultIPs.rows.forEach(row => {
            console.log(`   ✓ ${row.ip_address} - ${row.device_name}`);
        });
        console.log('');

        // Summary
        console.log('=' .repeat(60));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(60));
        console.log('\n📊 Summary:');
        console.log(`   • Tables created: ${tables.rows.length}`);
        console.log(`   • Default IPs configured: ${defaultIPs.rows.length}`);
        console.log(`   • Triggers installed: Yes`);
        console.log(`   • Indexes created: Yes`);
        console.log('\n🎯 Next Steps:');
        console.log('   1. Restart the backend server');
        console.log('   2. IP firewall middleware will activate automatically');
        console.log('   3. Access IP Access Control at: /admin/ip-access-control');
        console.log('   4. Monitor IP activity in real-time\n');

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED!');
        console.error('=' .repeat(60));
        console.error('Error:', error.message);
        console.error('\nStack Trace:');
        console.error(error.stack);
        console.error('=' .repeat(60));
        process.exit(1);
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed.\n');
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('✨ Migration process complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
