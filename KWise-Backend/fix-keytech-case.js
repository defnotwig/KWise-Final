const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:humbleludwig13@localhost:5432/KWiseDB'
});

(async () => {
    try {
        console.log('=== Fixing KEYTECH DARKVADER Case ===\n');
        
        // Fix 1: Remove conflicting GPU clearance fields
        // Keep only dimensions.max_gpu_length_mm = 355mm as source of truth
        console.log('1. Removing conflicting GPU clearance fields...');
        await pool.query(`
            UPDATE pc_parts 
            SET specifications = specifications - 'max_gpu_length' - 'max_gpu_length_mm'
            WHERE id = 609
        `);
        
        // Fix 2: Correct the wrong category field
        // Change "Micro-ATX and Mini-ITX" to match actual support
        console.log('2. Fixing incorrect category field...');
        await pool.query(`
            UPDATE pc_parts 
            SET specifications = jsonb_set(
                specifications, 
                '{category}', 
                '"ATX, Micro-ATX, and Mini-ITX"'
            )
            WHERE id = 609
        `);
        
        // Verify changes
        const result = await pool.query(`
            SELECT id, name, dimensions, specifications 
            FROM pc_parts 
            WHERE id = 609
        `);
        
        console.log('\n✅ KEYTECH DARKVADER Case Updated:\n');
        console.log('Dimensions:');
        console.log(JSON.stringify(result.rows[0].dimensions, null, 2));
        console.log('\nSpecifications:');
        console.log(JSON.stringify(result.rows[0].specifications, null, 2));
        
        console.log('\n✅ Database fixes complete!');
        console.log('   - GPU clearance: dimensions.max_gpu_length_mm = 355mm (only source)');
        console.log('   - Form factors: supported_form_factors = "ATX,Micro-ATX,Mini-ITX"');
        console.log('   - Category description updated');
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
