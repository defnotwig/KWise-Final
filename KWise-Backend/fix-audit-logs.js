/**
 * Fix audit_logs table schema - add missing entity column
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    database: process.env.DB_NAME || 'KWiseDB'
});

async function fixAuditLogsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing audit_logs table schema...');
        
        // Check if entity column exists
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND table_schema = 'public'
            AND column_name = 'entity'
        `);
        
        if (columnCheck.rows.length === 0) {
            console.log('📝 Adding entity column to audit_logs table...');
            
            // Add entity column as nullable first
            await client.query('ALTER TABLE audit_logs ADD COLUMN entity VARCHAR(100)');
            
            // Update existing records with table_name value
            await client.query('UPDATE audit_logs SET entity = table_name WHERE entity IS NULL');
            
            console.log('✅ Entity column added and populated');
        } else {
            console.log('✅ Entity column already exists');
        }
        
        // Check if table_name can be null
        const constraintCheck = await client.query(`
            SELECT column_name, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND table_schema = 'public'
            AND column_name IN ('entity', 'table_name')
        `);
        
        console.log('📊 Current column constraints:', constraintCheck.rows);
        
        console.log('✅ Audit logs table schema fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing audit_logs schema:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the fix
fixAuditLogsTable()
    .then(() => {
        console.log('🎉 Audit logs schema fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Audit logs schema fix failed:', error);
        process.exit(1);
    });
