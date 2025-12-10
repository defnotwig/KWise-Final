const db = require('../config/db');

(async () => {
    try {
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('pc_parts', 'stock_items') 
            ORDER BY table_name
        `);
        
        console.log('📋 Tables found:', result.rows.map(r => r.table_name).join(', '));
        
        if (result.rows.length === 0) {
            console.log('⚠️  No tables found!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
