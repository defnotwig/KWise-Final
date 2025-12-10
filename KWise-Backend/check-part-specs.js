const { query } = require('./config/db');

async function checkPartSpecs() {
    try {
        console.log('=== CPU SPECIFICATIONS ===');
        const cpus = await query(`
            SELECT name, category, specifications 
            FROM pc_parts 
            WHERE category = 'CPU' AND stock > 0 
            LIMIT 2
        `);
        console.log(JSON.stringify(cpus.rows, null, 2));

        console.log('\n=== MOTHERBOARD SPECIFICATIONS ===');
        const mbs = await query(`
            SELECT name, category, specifications 
            FROM pc_parts 
            WHERE category = 'Motherboard' AND stock > 0 
            LIMIT 2
        `);
        console.log(JSON.stringify(mbs.rows, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkPartSpecs();
