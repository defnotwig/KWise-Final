const db = require('./config/db');

(async () => {
    try {
        const result = await db.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category IN ('CPU', 'Motherboard') 
            LIMIT 3
        `);
        
        console.log('\n📋 Sample Product Specifications:\n');
        result.rows.forEach(product => {
            console.log(`ID: ${product.id}`);
            console.log(`Name: ${product.name}`);
            console.log(`Category: ${product.category}`);
            console.log(`Specifications type: ${typeof product.specifications}`);
            console.log(`Specifications:`);
            console.log(JSON.stringify(product.specifications, null, 2));
            console.log('─'.repeat(80));
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
