const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        const res = await pool.query(`
            SELECT id, name, category, dimensions, specifications 
            FROM pc_parts 
            WHERE category = 'GPU' 
            AND name ILIKE '%RTX4070%'
            LIMIT 3
        `);
        
        console.log(`=== Found ${res.rows.length} RTX 4070 GPUs ===\n`);
        
        res.rows.forEach(gpu => {
            console.log(`\n--- GPU ID ${gpu.id}: ${gpu.name} ---`);
            console.log('\nDimensions Object:');
            console.log(JSON.stringify(gpu.dimensions, null, 2));
            console.log('\nSpecifications Object:');
            console.log(JSON.stringify(gpu.specifications, null, 2));
        });
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
