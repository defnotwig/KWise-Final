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
            AND name ILIKE '%POWERLOGIC SLIM%' 
            LIMIT 1
        `);
        
        console.log('=== POWERLOGIC SLIM Case Data ===\n');
        
        if (res.rows.length > 0) {
            const caseData = res.rows[0];
            console.log('ID:', caseData.id);
            console.log('Name:', caseData.name);
            console.log('Category:', caseData.category);
            console.log('\n--- Dimensions Field ---');
            console.log(JSON.stringify(caseData.dimensions, null, 2));
            console.log('\n--- Specifications Field ---');
            console.log(JSON.stringify(caseData.specifications, null, 2));
        } else {
            console.log('No case found');
        }
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
