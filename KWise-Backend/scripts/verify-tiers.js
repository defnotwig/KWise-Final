/**
 * Verify tier population
 */
const { Pool } = require('pg');
require('dotenv').config();

async function verifyTiers() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'KWiseDB',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });

    try {
        console.log('🔗 Connecting to database...\n');
        const client = await pool.connect();

        // Check tier distribution
        const distribution = await client.query(`
            SELECT 
                tier,
                COUNT(*) as total_items,
                ROUND(AVG(price), 2) as avg_price
            FROM pc_parts
            WHERE is_active = true AND tier IS NOT NULL
            GROUP BY tier
            ORDER BY 
                CASE tier
                    WHEN 'entry' THEN 1
                    WHEN 'mid-tier' THEN 2
                    WHEN 'high-tier' THEN 3
                    WHEN 'elite' THEN 4
                END
        `);

        console.log('📊 Overall Tier Distribution:\n');
        console.table(distribution.rows);

        // Check items without tiers
        const nullTiers = await client.query(`
            SELECT COUNT(*) as count
            FROM pc_parts
            WHERE is_active = true AND (tier IS NULL OR tier = '')
        `);

        console.log(`\n⚠️  Items without tier: ${nullTiers.rows[0].count}\n`);

        // Show sample items per tier
        const samples = await client.query(`
            SELECT tier, category, name, price
            FROM pc_parts
            WHERE is_active = true AND tier IS NOT NULL
            ORDER BY tier, category, price
            LIMIT 20
        `);

        console.log('📋 Sample Items:\n');
        console.table(samples.rows);

        client.release();
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

verifyTiers();
