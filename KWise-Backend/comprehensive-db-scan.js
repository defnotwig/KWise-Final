const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function comprehensiveDatabaseScan() {
    try {
        console.log('🔍 COMPREHENSIVE DATABASE SCAN - K-Wise Specifications\n');

        // 1. Check pc_parts table structure and sample data
        console.log('📊 1. PC_PARTS TABLE ANALYSIS');
        console.log('═'.repeat(50));
        
        const tableInfo = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        
        console.log('Table columns:', tableInfo.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

        // 2. Check specifications population by category
        const categoryStats = await pool.query(`
            SELECT 
                category,
                COUNT(*) as total_items,
                COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END) as populated_items,
                CAST(
                    (COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END)::float / COUNT(*)) * 100 
                    AS DECIMAL(5,1)
                ) as percentage
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('\nSpecifications by Category:');
        categoryStats.rows.forEach(row => {
            const status = row.percentage >= 90 ? '✅' : row.percentage >= 50 ? '⚠️' : '❌';
            console.log(`${status} ${row.category.padEnd(12)} | ${row.populated_items}/${row.total_items} (${row.percentage}%)`);
        });

        // 3. Check specification_schemas table
        console.log('\n📋 2. SPECIFICATION_SCHEMAS TABLE ANALYSIS');
        console.log('═'.repeat(50));
        
        const schemaStats = await pool.query(`
            SELECT 
                category,
                COUNT(*) as field_count,
                array_agg(field_name ORDER BY field_name) as fields
            FROM specification_schemas 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('Schema fields by category:');
        schemaStats.rows.forEach(row => {
            console.log(`${row.category}: ${row.field_count} fields`);
            console.log(`  Fields: ${row.fields.slice(0, 5).join(', ')}${row.fields.length > 5 ? '...' : ''}`);
        });

        // 4. Sample populated specifications
        console.log('\n🔍 3. SAMPLE POPULATED SPECIFICATIONS');
        console.log('═'.repeat(50));
        
        const sampleSpecs = await pool.query(`
            SELECT name, category, specifications 
            FROM pc_parts 
            WHERE specifications IS NOT NULL 
            AND specifications != '{}' 
            ORDER BY category 
            LIMIT 6
        `);

        sampleSpecs.rows.forEach(row => {
            console.log(`\n📦 ${row.name} (${row.category})`);
            const specs = Object.entries(row.specifications);
            specs.slice(0, 3).forEach(([key, value]) => {
                console.log(`   • ${key}: ${value}`);
            });
            console.log(`   Total specs: ${specs.length}`);
        });

        // 5. Check for missing specifications fields
        console.log('\n❌ 4. MISSING SPECIFICATION FIELDS CHECK');
        console.log('═'.repeat(50));
        
        const missingFields = await pool.query(`
            SELECT DISTINCT category 
            FROM pc_parts p
            WHERE NOT EXISTS (
                SELECT 1 FROM specification_schemas s 
                WHERE s.category = p.category
            )
        `);

        if (missingFields.rows.length > 0) {
            console.log('Categories missing from specification_schemas:');
            missingFields.rows.forEach(row => {
                console.log(`❌ ${row.category}`);
            });
        } else {
            console.log('✅ All categories have specification schemas');
        }

        await pool.end();
        console.log('\n🎯 Database scan complete!');
        
    } catch (error) {
        console.error('❌ Error during database scan:', error);
        await pool.end();
    }
}

comprehensiveDatabaseScan();