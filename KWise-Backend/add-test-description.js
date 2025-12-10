require('dotenv').config();
const { query } = require('./config/db');

async function addTestDescription() {
    try {
        await query("UPDATE pc_parts SET description = 'Test CPU description for debugging' WHERE id = 34");
        console.log('✅ Added test description to item 34');
        
        const result = await query('SELECT id, name, description FROM pc_parts WHERE id = 34');
        console.log('Verified database state:', result.rows[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addTestDescription();