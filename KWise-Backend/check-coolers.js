const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkCoolers() {
    try {
        // Check all coolers with Intel in name
        const result = await pool.query(`
            SELECT id, name, specifications->'compatible_sockets' as sockets 
            FROM pc_parts 
            WHERE category = 'Cooling'
            ORDER BY name
        `);
        
        console.log('\n=== ALL COOLERS AND THEIR SOCKET SUPPORT ===\n');
        result.rows.forEach(row => {
            console.log(`ID ${row.id}: ${row.name}`);
            console.log(`   Sockets: ${JSON.stringify(row.sockets)}`);
        });
        
        console.log('\n=== TOTAL COOLERS:', result.rows.length);
        
        // Check if ANY cooler supports LGA1151
        const lga1151Check = result.rows.filter(row => {
            const sockets = row.sockets;
            if (Array.isArray(sockets)) {
                return sockets.some(s => s.includes('1151') || s.includes('LGA1151'));
            }
            return false;
        });
        
        console.log('\n=== COOLERS SUPPORTING LGA1151:', lga1151Check.length);
        lga1151Check.forEach(c => console.log('   -', c.name));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkCoolers();
