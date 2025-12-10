const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        console.log('=== Fixing RTX 4070 GPUs - Removing Conflicting Length Fields ===\n');
        
        // Remove conflicting length fields from specifications
        // Keep only dimensions.length_mm as the source of truth
        const result = await pool.query(`
            UPDATE pc_parts 
            SET specifications = specifications - 'length' - 'length_mm'
            WHERE category = 'GPU' 
            AND name ILIKE '%RTX4070%'
            RETURNING id, name
        `);
        
        console.log(`✅ Updated ${result.rows.length} RTX 4070 GPUs:\n`);
        result.rows.forEach(gpu => {
            console.log(`   - ID ${gpu.id}: ${gpu.name}`);
        });
        
        console.log('\n✅ Database fixed! GPU length is now ONLY in dimensions.length_mm');
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
