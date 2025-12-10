/**
 * Database Schema Checker
 * Verifies existing tables and their structures
 */

const db = require('../config/db');

async function checkDatabaseSchema() {
    try {
        console.log('📊 Checking Database Schema...\n');

        // Get all tables
        const tablesResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('✅ Existing Tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        console.log('\n📋 Checking compatibility-related tables...\n');

        // Check compatibility_rules table
        const rulesCount = await db.query('SELECT COUNT(*) FROM compatibility_rules');
        console.log(`✅ compatibility_rules: ${rulesCount.rows[0].count} rules`);

        // Check bios_compatibility table
        const biosCount = await db.query('SELECT COUNT(*) FROM bios_compatibility');
        console.log(`✅ bios_compatibility: ${biosCount.rows[0].count} entries`);

        // Check if advanced compatibility tables exist
        const advancedTables = [
            'cpu_compatibility',
            'gpu_compatibility',
            'psu_compatibility',
            'case_compatibility',
            'ram_compatibility',
            'cooler_compatibility',
            'storage_compatibility',
            'known_compatibility_issues'
        ];

        console.log('\n🔍 Checking for advanced compatibility tables:');
        for (const table of advancedTables) {
            const exists = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);

            if (exists.rows[0].exists) {
                const count = await db.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ✅ ${table}: ${count.rows[0].count} entries`);
            } else {
                console.log(`   ❌ ${table}: NOT FOUND (needs creation)`);
            }
        }

        // Check pc_parts for component specifications
        const partsCount = await db.query('SELECT COUNT(*) FROM pc_parts');
        console.log(`\n📦 pc_parts: ${partsCount.rows[0].count} products`);

        // Sample specifications structure
        const samplePart = await db.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE specifications IS NOT NULL 
            LIMIT 1
        `);

        if (samplePart.rows.length > 0) {
            console.log('\n📝 Sample product specifications structure:');
            console.log(JSON.stringify(samplePart.rows[0], null, 2));
        }

        console.log('\n✅ Database schema check complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error checking database schema:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkDatabaseSchema();
