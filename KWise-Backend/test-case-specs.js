const { Pool } = require('pg');
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function checkCaseSpecs() {
    try {
        const result = await db.query(`
            SELECT name, brand, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%KEYTECH ROBIN MINI%' 
            AND category = 'Case' 
            AND is_active = true 
            LIMIT 1
        `);
        
        console.log('=== KEYTECH ROBIN MINI Case Specifications ===');
        console.log(JSON.stringify(result.rows, null, 2));
        
        if (result.rows.length > 0) {
            const specs = result.rows[0].specifications;
            console.log('\n=== Drive Bay Fields ===');
            console.log('drive_bays:', specs?.drive_bays);
            console.log('drive_bays_25:', specs?.drive_bays_25);
            console.log('drive_bays_35:', specs?.drive_bays_35);
            console.log('"Drive Bays":', specs?.['Drive Bays']);
            console.log('"2.5\\" Drive Bays":', specs?.['2.5" Drive Bays']);
            console.log('"3.5\\" Drive Bays":', specs?.['3.5" Drive Bays']);
        }
        
        await db.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCaseSpecs();
