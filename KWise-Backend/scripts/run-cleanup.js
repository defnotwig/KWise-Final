const fs = require('node:fs');
const path = require('node:path');
const db = require('../config/db');

async function runCleanup() {
    try {
        console.log('🔧 Starting password reset token cleanup...');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'cleanup-reset-tokens.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        const result = await db.query(sql);

        console.log('✅ Database cleanup completed successfully!');
        console.log('📊 Cleanup results:', result.rows);

        // Verify the current state
        const verifyResult = await db.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN password_reset_token IS NOT NULL THEN 1 END) as users_with_active_tokens,
                COUNT(CASE WHEN reset_status != 'none' THEN 1 END) as users_with_reset_status
            FROM users
        `);

        console.log('📋 Current database state:', verifyResult.rows[0]);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

runCleanup();

