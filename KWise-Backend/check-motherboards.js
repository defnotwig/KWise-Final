const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkMotherboards() {
    try {
        // Check motherboard socket distribution
        const result = await pool.query(`
            SELECT id, name, specifications->>'socket' as socket 
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            ORDER BY specifications->>'socket'
        `);
        
        console.log('=== MOTHERBOARD ANALYSIS ===\n');
        console.log(`TOTAL MOTHERBOARDS: ${result.rows.length}\n`);
        
        // Count by socket
        const socketCounts = {};
        result.rows.forEach(row => {
            const socket = row.socket || 'NULL';
            socketCounts[socket] = (socketCounts[socket] || 0) + 1;
        });
        
        console.log('SOCKET DISTRIBUTION:');
        Object.keys(socketCounts).sort().forEach(socket => {
            console.log(`   ${socket}: ${socketCounts[socket]} motherboards`);
        });
        
        // Check for LGA1151
        console.log('\n=== LGA1151 MOTHERBOARDS ===');
        const lga1151 = result.rows.filter(r => r.socket === 'LGA1151');
        console.log(`LGA1151 motherboards: ${lga1151.length}`);
        lga1151.forEach(m => console.log(`   - ${m.name}`));
        
        // Check what CPUs need LGA1151
        const cpuResult = await pool.query(`
            SELECT id, name, specifications->>'socket' as socket 
            FROM pc_parts 
            WHERE category = 'CPU' 
            AND specifications->>'socket' = 'LGA1151'
        `);
        
        console.log('\n=== CPUs NEEDING LGA1151 ===');
        console.log(`LGA1151 CPUs: ${cpuResult.rows.length}`);
        cpuResult.rows.forEach(c => console.log(`   - ${c.name}`));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkMotherboards();
