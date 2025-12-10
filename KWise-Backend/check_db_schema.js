const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'KWiseDB',
    password: 'humbleludwig13',
    port: 5432
});

async function checkSchema() {
    try {
        console.log('🔍 CHECKING DATABASE SCHEMA FOR SPECIFICATIONS STORAGE\n');
        
        // Check pc_parts table schema
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position;
        `;
        
        const result = await pool.query(schemaQuery);
        console.log('📋 PC_PARTS Table Schema:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
        });
        
        // Check if specifications column exists
        const hasSpecs = result.rows.find(row => row.column_name === 'specifications');
        console.log(`\n🔧 Specifications column exists: ${hasSpecs ? 'YES (' + hasSpecs.data_type + ')' : 'NO'}`);
        
        // Check for any spec-related columns
        const specColumns = result.rows.filter(row => 
            row.column_name.includes('spec') || 
            row.column_name.includes('specification')
        );
        
        if (specColumns.length > 0) {
            console.log('\n📊 Specification-related columns found:');
            specColumns.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type}`);
            });
        }
        
        // Sample a few records to see current data structure
        const sampleQuery = `
            SELECT id, name, category, 
                   CASE WHEN specifications IS NOT NULL THEN 'HAS_SPECS' ELSE 'NO_SPECS' END as spec_status
            FROM pc_parts 
            WHERE category IN ('RAM', 'Case', 'GPU') 
            LIMIT 5;
        `;
        
        try {
            const sampleResult = await pool.query(sampleQuery);
            console.log('\n📊 Sample data structure:');
            sampleResult.rows.forEach(row => {
                console.log(`  ID ${row.id}: ${row.name} (${row.category}) - ${row.spec_status}`);
            });
        } catch (error) {
            console.log('\n⚠️  Could not query specifications column - likely does not exist');
        }
        
        // Recommend storage type
        if (hasSpecs) {
            console.log(`\n✅ RECOMMENDATION: Use existing '${hasSpecs.column_name}' column (${hasSpecs.data_type})`);
        } else {
            console.log('\n💡 RECOMMENDATION: Add specifications JSONB column to pc_parts table');
        }
        
    } catch (error) {
        console.error('❌ Database schema check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();