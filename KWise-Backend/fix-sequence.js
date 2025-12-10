const { query } = require('./config/db');

(async () => {
    try {
        console.log('🔧 Fixing orders sequence...');
        
        // Get current max ID
        const maxResult = await query('SELECT COALESCE(MAX(id), 0) as max_id FROM orders');
        const maxId = maxResult.rows[0].max_id;
        console.log(`📊 Current max ID: ${maxId}`);
        
        // Set sequence to max ID + 1
        await query(`SELECT setval('orders_id_seq', ${maxId + 1})`);
        console.log(`✅ Sequence set to ${maxId + 1}`);
        
        // Test next value
        const nextResult = await query('SELECT nextval(\'orders_id_seq\') as next_id');
        console.log(`🔢 Next ID will be: ${nextResult.rows[0].next_id}`);
        
        // Reset sequence back to correct position
        await query(`SELECT setval('orders_id_seq', ${maxId + 1})`);
        
        console.log('✅ Sequence fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing sequence:', error);
        process.exit(1);
    }
})();