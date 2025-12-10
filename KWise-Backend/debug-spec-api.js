const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function debugSpecificationAPI() {
    try {
        console.log('🔍 Debug: Testing specification API responses...\n');

        const categories = ['Case', 'CPU', 'GPU', 'RAM', 'Storage', 'Motherboard'];
        
        for (const category of categories) {
            console.log(`\n📊 Testing category: ${category}`);
            
            // Test database query
            const dbResult = await pool.query(`
                SELECT name, type, required, default_value 
                FROM specification_schemas 
                WHERE category = $1 
                ORDER BY name
            `, [category]);
            
            console.log(`   DB fields found: ${dbResult.rows.length}`);
            
            if (dbResult.rows.length > 0) {
                console.log(`   Sample fields: ${dbResult.rows.slice(0, 3).map(r => r.name).join(', ')}`);
            }
            
            // Test what the API would return
            const apiResponse = dbResult.rows.map(row => ({
                name: row.name,
                type: row.type,
                required: row.required,
                defaultValue: row.default_value
            }));
            
            console.log(`   API response size: ${JSON.stringify(apiResponse).length} chars`);
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

debugSpecificationAPI();