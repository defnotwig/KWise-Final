const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: String(process.env.DB_PASSWORD || 'humbleludwig13'),
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 20,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

async function checkDatabaseStatus() {
    console.log('\n========== DATABASE COMPATIBILITY STATUS ==========\n');

    try {
        // 1. Check compatibility tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%compatibility%' 
            ORDER BY table_name
        `);
        console.log('✅ COMPATIBILITY TABLES FOUND:');
        tablesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });

        // 2. Count rules
        const rulesCountResult = await pool.query(`
            SELECT 
                COUNT(*) as total_rules,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_rules,
                COUNT(DISTINCT rule_category) as categories
            FROM compatibility_rules
        `);
        console.log('\n✅ COMPATIBILITY RULES COUNT:');
        const stats = rulesCountResult.rows[0];
        console.log(`   Total Rules: ${stats.total_rules}`);
        console.log(`   Enabled Rules: ${stats.enabled_rules}`);
        console.log(`   Rule Categories: ${stats.categories}`);

        // 3. Rules by category
        const categoryResult = await pool.query(`
            SELECT 
                rule_category, 
                COUNT(*) as count,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM compatibility_rules WHERE enabled = true)), 2) as percentage
            FROM compatibility_rules 
            WHERE enabled = true 
            GROUP BY rule_category 
            ORDER BY count DESC
        `);
        console.log('\n✅ RULES BY CATEGORY:');
        categoryResult.rows.forEach(row => {
            console.log(`   ${row.rule_category.padEnd(25)} ${String(row.count).padStart(5)} rules (${row.percentage}%)`);
        });

        // 4. Sample rules
        const sampleResult = await pool.query(`
            SELECT rule_name, rule_category, severity 
            FROM compatibility_rules 
            WHERE enabled = true 
            LIMIT 10
        `);
        console.log('\n✅ SAMPLE RULES (first 10):');
        sampleResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. [${row.severity.toUpperCase()}] ${row.rule_name} (${row.rule_category})`);
        });

        // 5. Check for component-specific tables
        const componentTablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (
                table_name LIKE '%cpu_compatibility%' OR
                table_name LIKE '%gpu_compatibility%' OR
                table_name LIKE '%motherboard_compatibility%' OR
                table_name LIKE '%ram_compatibility%' OR
                table_name LIKE '%psu_compatibility%' OR
                table_name LIKE '%cooler_compatibility%' OR
                table_name LIKE '%case_compatibility%' OR
                table_name LIKE '%storage_compatibility%'
            )
            ORDER BY table_name
        `);
        console.log('\n✅ COMPONENT-SPECIFIC COMPATIBILITY TABLES:');
        if (componentTablesResult.rows.length === 0) {
            console.log('   ⚠️  NONE FOUND - These need to be created!');
        } else {
            componentTablesResult.rows.forEach((row, i) => {
                console.log(`   ${i + 1}. ${row.table_name}`);
            });
        }

        console.log('\n===================================================\n');

    } catch (error) {
        console.error('❌ Database query error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseStatus();
