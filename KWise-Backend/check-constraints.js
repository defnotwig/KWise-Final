/**
 * Check Orders Table Constraints
 */

require('dotenv').config();
const { query, pool } = require('./config/db');

async function checkConstraints() {
    try {
        console.log('\n📊 CHECKING ORDERS TABLE CONSTRAINTS\n');
        console.log('='.repeat(60));

        const result = await query(`
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'orders'::regclass 
            AND contype = 'c'
        `);

        console.log('\n✅ Found', result.rows.length, 'check constraints:\n');
        
        result.rows.forEach((constraint, index) => {
            console.log(`${index + 1}. ${constraint.constraint_name}`);
            console.log(`   ${constraint.constraint_definition}\n`);
        });

        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

checkConstraints();
