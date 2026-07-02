const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function runMigrations() {
    console.log('🚀 Running database migrations...\n');
    
    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        
        // Get all migration files
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Run in alphabetical order
        
        console.log(`Found ${migrationFiles.length} migration files:\n`);
        
        for (const file of migrationFiles) {
            console.log(`📄 Running migration: ${file}`);
            
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            try {
                await pool.query(sql);
                console.log(`✅ Migration ${file} completed successfully`);
            } catch (error) {
                console.error(`❌ Migration ${file} failed:`, error.message);
                throw error;
            }
        }
        
        console.log('\n🎉 All migrations completed successfully!');
        
        // Verify tables were created
        console.log('\n🔍 Verifying created tables...');
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%_specs' OR table_name = 'pc_parts'
            ORDER BY table_name;
        `);
        
        console.log('\n📋 Created tables:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('\n💥 Migration process failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    runMigrations().catch(console.error);
}

module.exports = { runMigrations };
