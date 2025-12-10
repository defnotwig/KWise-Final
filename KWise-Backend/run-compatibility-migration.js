/**
 * Run Comprehensive Compatibility Specifications Migration
 * Adds all missing fields required for accurate PC compatibility checking
 */

const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('='.repeat(80));
        console.log('🔧 STARTING COMPREHENSIVE COMPATIBILITY MIGRATION');
        console.log('='.repeat(80));
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'sql', 'comprehensive-compatibility-specifications.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by verification queries section
        const parts = sql.split('-- VERIFICATION QUERIES');
        const migrationSQL = parts[0];
        const verificationSQL = parts[1];
        
        console.log('\n📊 Running migration SQL...\n');
        
        // Run migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!\n');
        console.log('='.repeat(80));
        console.log('📋 VERIFICATION RESULTS');
        console.log('='.repeat(80));
        
        // Run verification queries
        const queries = verificationSQL.split(';').filter(q => q.trim() && q.includes('SELECT'));
        
        for (const query of queries) {
            const trimmedQuery = query.trim();
            if (!trimmedQuery) continue;
            
            // Extract table name from comment
            const match = trimmedQuery.match(/--\s*Check\s+(\w+)\s+specifications/);
            const tableName = match ? match[1] : 'Unknown';
            
            console.log(`\n📌 ${tableName.toUpperCase()} SPECIFICATIONS:`);
            console.log('-'.repeat(80));
            
            const result = await client.query(trimmedQuery + ';');
            
            if (result.rows.length > 0) {
                console.table(result.rows);
            } else {
                console.log('  No data found.');
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\n📋 Summary:');
        console.log('  ✓ Added motherboard compatibility fields (form_factor, pcie_slots, sata_ports, power_connector_pins)');
        console.log('  ✓ Added RAM configuration fields (stick_count, total_capacity)');
        console.log('  ✓ Added storage form_factor and bus_interface fields');
        console.log('  ✓ Added GPU power_connectors and multi_gpu_technology fields');
        console.log('  ✓ Added PSU connector count fields');
        console.log('  ✓ Added case physical clearance fields');
        console.log('  ✓ Added cooling compatibility fields');
        console.log('  ✓ Created performance indexes');
        console.log('\n🎯 Next Steps:');
        console.log('  1. Update compatibility service with new validation logic');
        console.log('  2. Update PCCustomized component to use new fields');
        console.log('  3. Test compatibility validation end-to-end');
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
