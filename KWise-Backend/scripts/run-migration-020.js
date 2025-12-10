/**
 * Run Database Migration: 020_optimize_compatibility_indexes.sql
 * Adds JSON indexes and optimizes compatibility query performance
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('🚀 Running Migration 020: Compatibility Indexes Optimization\n');
    
    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, '../sql/migrations/020_optimize_compatibility_indexes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements (separated by semicolons)
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            
            // Skip comments and empty statements
            if (stmt.startsWith('--') || stmt.trim() === '') continue;
            
            try {
                // Extract statement type for logging
                const stmtType = stmt.match(/^\s*(CREATE|DROP|ALTER|INSERT|SELECT|COMMENT|ANALYZE|REFRESH)/i)?.[1] || 'EXECUTE';
                
                console.log(`[${i+1}/${statements.length}] ${stmtType}...`);
                
                const result = await db.query(stmt);
                
                // Log result if it's a SELECT query
                if (stmt.toLowerCase().includes('select') && result.rows && result.rows.length > 0) {
                    console.log('   Result:', JSON.stringify(result.rows[0], null, 2));
                }
                
                successCount++;
                console.log(`   ✅ Success\n`);
                
            } catch (error) {
                errorCount++;
                // Some errors are acceptable (e.g., index already exists)
                if (error.message.includes('already exists') || error.message.includes('does not exist')) {
                    console.log(`   ⚠️  Warning: ${error.message}\n`);
                } else {
                    console.error(`   ❌ Error: ${error.message}\n`);
                }
            }
        }
        
        console.log('═'.repeat(70));
        console.log('📊 MIGRATION SUMMARY');
        console.log('═'.repeat(70));
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📝 Total: ${statements.length}`);
        console.log('═'.repeat(70));
        
        // Verify indexes were created
        console.log('\n🔍 Verifying Indexes...\n');
        
        const indexCheckQuery = `
            SELECT 
                tablename,
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' 
            AND tablename IN ('compatibility_rules', 'pc_parts', 'compatibility_matrix')
            AND indexname LIKE 'idx_compat%'
            ORDER BY tablename, indexname;
        `;
        
        const indexResult = await db.query(indexCheckQuery);
        
        console.log(`Found ${indexResult.rows.length} compatibility indexes:`);
        indexResult.rows.forEach(row => {
            console.log(`   ✓ ${row.tablename}.${row.indexname}`);
        });
        
        console.log('\n✅ Migration 020 completed successfully!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
runMigration();
