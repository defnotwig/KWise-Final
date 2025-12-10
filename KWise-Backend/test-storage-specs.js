const { Pool } = require('pg');
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function checkStorageSpecs() {
    try {
        const result = await db.query(`
            SELECT name, brand, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%WESTERN DIGITAL%GEN3%' 
            AND category = 'Storage' 
            AND is_active = true 
            LIMIT 1
        `);
        
        console.log('=== 250GB WESTERN DIGITAL Specifications ===');
        console.log(JSON.stringify(result.rows, null, 2));
        
        if (result.rows.length > 0) {
            const specs = result.rows[0].specifications;
            console.log('\n=== Storage Interface ===');
            console.log('interface:', specs?.interface);
            console.log('Interface:', specs?.Interface);
            console.log('type:', specs?.type);
            console.log('Type:', specs?.Type);
            console.log('form_factor:', specs?.form_factor);
            console.log('Form Factor:', specs?.['Form Factor']);
        }
        
        await db.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStorageSpecs();
