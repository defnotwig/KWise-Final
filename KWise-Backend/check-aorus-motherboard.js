const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        const res = await pool.query(`
            SELECT id, name, category, dimensions, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%AORUS ELITE B550M AX%'
            LIMIT 1
        `);
        
        console.log(`=== AORUS ELITE B550M AX Motherboard ===\n`);
        
        if (res.rows.length > 0) {
            const mb = res.rows[0];
            console.log(`ID: ${mb.id}`);
            console.log(`Name: ${mb.name}`);
            console.log(`Category: ${mb.category}`);
            console.log('\nDimensions:');
            console.log(JSON.stringify(mb.dimensions, null, 2));
            console.log('\nSpecifications:');
            console.log(JSON.stringify(mb.specifications, null, 2));
        }
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
