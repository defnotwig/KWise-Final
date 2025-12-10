const db = require('../config/db');

(async () => {
    const result = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pc_parts' 
        ORDER BY ordinal_position
    `);
    
    console.log('pc_parts columns:', result.rows.map(r => r.column_name).join(', '));
    process.exit(0);
})();
