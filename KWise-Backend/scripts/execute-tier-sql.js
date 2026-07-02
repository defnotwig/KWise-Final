/**
 * Execute SQL script to populate tiers
 */
const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

async function executeSQLScript() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'KWiseDB',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });

    try {
        console.log('🔗 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected to', process.env.DB_NAME || 'KWiseDB');

        const sqlPath = path.join(__dirname, '..', 'sql', 'populate-tiers.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('\n🏆 Executing tier population script...\n');

        // Split by semicolons and execute each statement
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    const result = await client.query(statement);
                    if (result.rows && result.rows.length > 0) {
                        console.table(result.rows);
                    } else if (result.rowCount > 0) {
                        console.log(`✅ Updated ${result.rowCount} rows`);
                    }
                } catch (err) {
                    console.error('❌ Error executing statement:', err.message);
                }
            }
        }

        client.release();
        await pool.end();
        console.log('\n🎉 Tier population complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        await pool.end();
        process.exit(1);
    }
}

executeSQLScript();
