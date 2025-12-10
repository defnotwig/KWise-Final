/**
 * Phase 2 Database Migration Runner
 * Creates and populates component compatibility tables
 */

const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Starting Phase 2 Database Migration...\n');
        
        // Step 1: Create tables
        console.log('📊 Creating component compatibility tables...');
        const createSQL = fs.readFileSync(
            path.join(__dirname, 'sql', 'phase2-component-compatibility-tables.sql'),
            'utf8'
        );
        
        // Execute create statements - split by semicolons and filter empty statements
        const createStatements = createSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of createStatements) {
            if (statement.includes('CREATE TABLE') || 
                statement.includes('CREATE INDEX') || 
                statement.includes('CREATE TRIGGER') ||
                statement.includes('CREATE OR REPLACE FUNCTION')) {
                await db.query(statement);
            }
        }
        console.log('✅ Tables created successfully!\n');
        
        // Step 2: Populate data
        console.log('📝 Populating compatibility data from pc_parts...');
        const populateSQL = fs.readFileSync(
            path.join(__dirname, 'sql', 'phase2-populate-compatibility-data.sql'),
            'utf8'
        );
        
        // Execute populate statements - split by semicolons
        const populateStatements = populateSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of populateStatements) {
            if (statement.includes('INSERT INTO')) {
                await db.query(statement);
            }
        }
        console.log('✅ Data population complete!\n');
        
        // Step 3: Verify results
        console.log('📊 Verifying migration results...\n');
        const verifyResult = await db.query(`
            SELECT 
                'CPU Compatibility' AS table_name, 
                COUNT(*)::int AS records 
            FROM cpu_compatibility
            UNION ALL
            SELECT 'GPU Compatibility', COUNT(*)::int 
            FROM gpu_compatibility
            UNION ALL
            SELECT 'PSU Compatibility', COUNT(*)::int 
            FROM psu_compatibility
            UNION ALL
            SELECT 'Motherboard Compatibility', COUNT(*)::int 
            FROM motherboard_compatibility
            UNION ALL
            SELECT 'RAM Compatibility', COUNT(*)::int 
            FROM ram_compatibility
            UNION ALL
            SELECT 'Cooler Compatibility', COUNT(*)::int 
            FROM cooler_compatibility
            UNION ALL
            SELECT 'Case Compatibility', COUNT(*)::int 
            FROM case_compatibility
            UNION ALL
            SELECT 'Storage Compatibility', COUNT(*)::int 
            FROM storage_compatibility
            UNION ALL
            SELECT 'Known Issues', COUNT(*)::int 
            FROM known_compatibility_issues
            ORDER BY table_name
        `);
        
        console.log('✅ Migration Results:');
        console.table(verifyResult.rows);
        
        // Calculate totals
        const totalRecords = verifyResult.rows.reduce((sum, row) => sum + parseInt(row.records), 0);
        console.log(`\n🎉 Phase 2 Migration Complete!`);
        console.log(`📊 Total Records Created: ${totalRecords}`);
        console.log(`✅ 9 new tables ready for advanced compatibility checking\n`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run migration
runMigration();
