const db = require('../config/db');

(async () => {
    try {
        console.log('📊 Checking table structures and data...\n');
        
        // Check pc_parts
        const pcPartsCount = await db.query('SELECT COUNT(*) as count FROM pc_parts');
        const pcPartsSample = await db.query('SELECT * FROM pc_parts LIMIT 1');
        
        console.log('=== PC_PARTS TABLE ===');
        console.log(`Total rows: ${pcPartsCount.rows[0].count}`);
        console.log('Columns:', pcPartsSample.fields.map(f => f.name).join(', '));
        console.log('');
        
        // Check stock_items
        const stockItemsCount = await db.query('SELECT COUNT(*) as count FROM stock_items');
        const stockItemsSample = await db.query('SELECT * FROM stock_items LIMIT 1');
        
        console.log('=== STOCK_ITEMS TABLE ===');
        console.log(`Total rows: ${stockItemsCount.rows[0].count}`);
        console.log('Columns:', stockItemsSample.fields.map(f => f.name).join(', '));
        console.log('');
        
        // Check if they're related
        console.log('=== MIGRATION STATUS ===');
        const classCheck = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(classification) as classified
            FROM stock_items
        `);
        console.log(`Stock items with classification: ${classCheck.rows[0].classified}/${classCheck.rows[0].total}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
