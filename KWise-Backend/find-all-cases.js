const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        const res = await pool.query(`
            SELECT id, name, category, dimensions, specifications 
            FROM pc_parts 
            WHERE category = 'PC Case' 
            LIMIT 5
        `);
        
        console.log(`=== Found ${res.rows.length} PC Cases ===\n`);
        
        res.rows.forEach(caseData => {
            console.log(`\n--- Case ID ${caseData.id}: ${caseData.name} ---`);
            console.log('Dimensions:', JSON.stringify(caseData.dimensions, null, 2));
            console.log('Specifications:', JSON.stringify(caseData.specifications, null, 2));
        });
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
