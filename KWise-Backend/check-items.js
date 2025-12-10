require('dotenv').config();
const { query } = require('./config/db');

async function checkItems() {
    try {
        const result = await query('SELECT id, name, description FROM pc_parts LIMIT 5');
        console.log('Available items for testing:');
        result.rows.forEach((item, i) => {
            console.log(`${i+1}. ID: ${item.id} | Name: ${item.name} | Description: "${item.description || 'NULL'}"`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkItems();