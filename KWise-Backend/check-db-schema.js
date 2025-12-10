const db = require('./config/db');

(async () => {
    try {
        await db.connectDB();
        
        console.log('📊 Checking pc_parts table schema...\n');
        
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            AND (column_name LIKE '%spec%' OR column_name LIKE '%dimension%')
            ORDER BY column_name
        `);
        
        console.log('Specification/Dimension columns:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        // Check if we have any test data
        const countResult = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);
        
        console.log('\n📦 Parts count by category:');
        console.log(JSON.stringify(countResult.rows, null, 2));
        
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
