require('dotenv').config();
const { query } = require('./config/db');

async function checkCategoryConstraint() {
    try {
        // Check the category constraint
        const constraintResult = await query(`
            SELECT conname as constraint_name, 
                   pg_get_constraintdef(oid) as check_clause
            FROM pg_constraint 
            WHERE conname LIKE '%category%' AND contype = 'c'
        `);
        
        console.log('Category constraint:', constraintResult.rows);
        
        // Also check what categories are currently in use
        const categoriesResult = await query('SELECT DISTINCT category FROM pc_parts ORDER BY category');
        console.log('\nExisting categories in database:');
        categoriesResult.rows.forEach(row => console.log(`- ${row.category}`));
        
        // Check the current item's category
        const itemResult = await query('SELECT id, name, category FROM pc_parts WHERE id = 34');
        console.log('\nCurrent item 34:', itemResult.rows[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkCategoryConstraint();