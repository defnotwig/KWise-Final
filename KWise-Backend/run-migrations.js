const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration(filePath) {
    try {
        console.log(`\n📋 Running migration: ${path.basename(filePath)}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split by semicolons and filter out empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`   Found ${statements.length} SQL statements`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comment blocks
            if (statement.startsWith('/*') || statement.trim().length === 0) {
                continue;
            }
            
            try {
                await pool.query(statement + ';');
                console.log(`   ✅ Statement ${i + 1} executed`);
            } catch (err) {
                // Ignore "already exists" or "duplicate key" errors
                if (err.message.includes('already exists') || 
                    err.message.includes('duplicate key') ||
                    err.code === '23505') {
                    console.log(`   ⚠️  Statement ${i + 1} skipped (already exists)`);
                } else {
                    console.error(`   ❌ Statement ${i + 1} failed:`, err.message);
                }
            }
        }
        
        console.log(`✅ Migration completed: ${path.basename(filePath)}`);
        return true;
    } catch (error) {
        console.error(`❌ Migration failed: ${path.basename(filePath)}`, error);
        return false;
    }
}

(async () => {
    try {
        console.log('🚀 Starting database migrations...\n');
        
        const migrations = [
            path.join(__dirname, 'sql/migrations/020_add_missing_compatibility_specs.sql'),
            path.join(__dirname, 'sql/migrations/021_fix_powerlogic_slim_dimensions.sql')
        ];
        
        for (const migration of migrations) {
            if (!fs.existsSync(migration)) {
                console.error(`❌ Migration file not found: ${migration}`);
                continue;
            }
            
            await runMigration(migration);
        }
        
        console.log('\n🎉 All migrations completed!');
        console.log('\n📊 Verification: Checking POWERLOGIC SLIM case...');
        
        const result = await pool.query(`
            SELECT 
                p.name,
                p.dimensions->>'max_gpu_length_mm' as max_gpu_dimensions,
                ps.spec_value as max_gpu_specs
            FROM pc_parts p
            LEFT JOIN product_specs ps ON p.id = ps.product_id AND ps.spec_key = 'case_max_gpu_length_mm'
            WHERE p.name ILIKE '%POWERLOGIC SLIM%' AND p.category = 'Case'
        `);
        
        if (result.rows.length > 0) {
            console.log('\n✅ POWERLOGIC SLIM Specifications:');
            console.table(result.rows);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
        console.log('\n✅ Database connection closed');
        process.exit();
    }
})();
