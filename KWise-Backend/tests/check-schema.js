const {query} = require('../config/db');

async function checkSchema() {
    try {
        const result = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        console.log('PC_PARTS TABLE SCHEMA:');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
