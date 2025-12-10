const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        console.log('=== Fixing POWERLOGIC SLIM Case GPU Clearance ===\n');
        
        // Remove conflicting GPU length fields from specifications
        // Keep only dimensions.max_gpu_length_mm as the source of truth
        const result = await pool.query(`
            UPDATE pc_parts 
            SET specifications = specifications - 'max_gpu_length' - 'max_gpu_length_mm' - 'Max Gpu Length'
            WHERE id = 602
            RETURNING id, name, specifications
        `);
        
        console.log('✅ Updated case ID:', result.rows[0].id);
        console.log('✅ Case name:', result.rows[0].name);
        console.log('\n--- Updated Specifications (removed conflicting fields) ---');
        console.log(JSON.stringify(result.rows[0].specifications, null, 2));
        
        console.log('\n✅ Database fixed! GPU clearance is now ONLY in dimensions.max_gpu_length_mm = 250mm');
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
