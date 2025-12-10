const db = require('../config/db');

async function checkSchema() {
    try {
        const result = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        
        console.log('pc_parts table schema:');
        result.rows.forEach(r => {
            console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
        });
        
        // Check for status/enabled columns
        const hasStatus = result.rows.some(r => r.column_name === 'status');
        const hasEnabled = result.rows.some(r => r.column_name === 'enabled');
        
        console.log('\nColumn checks:');
        console.log(`  has 'status' column: ${hasStatus}`);
        console.log(`  has 'enabled' column: ${hasEnabled}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkSchema();
