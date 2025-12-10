// Migration script to add daily queue reset functionality
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection config
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting queue daily reset migration...');
        
        // Read SQL file
        const sqlPath = path.join(__dirname, '../sql/queue-daily-reset-migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute migration
        await client.query(sql);
        
        console.log('✅ Migration completed successfully!');
        console.log('   - Added assigned_date column to queue_management table');
        console.log('   - Updated get_next_queue_number() function');
        console.log('   - Updated assign_queue_to_order() function');
        console.log('   - Updated cleanup_completed_queues() function');
        console.log('   - Added daily_queue_reset() function');
        console.log('   - Updated trigger update_queue_status()');
        console.log('   - Updated active_queue_view');
        console.log('');
        console.log('ℹ️  Queue numbers will now only recycle after midnight!');
        console.log('   Same-day recycling is now prevented.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('   Full error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
