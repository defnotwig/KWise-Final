const { query } = require('./config/db');

async function checkSpecs() {
    try {
        // Check AORUS B650 motherboard
        const mb = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%AORUS B650%' 
            LIMIT 1
        `);
        console.log('\n=== AORUS B650 ELITE AX ICE ===');
        console.log(JSON.stringify(mb.rows[0], null, 2));

        // Check POWERLOGIC SLIM case
        const pc = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%POWERLOGIC SLIM%' 
            LIMIT 1
        `);
        console.log('\n=== POWERLOGIC SLIM (Black) ===');
        console.log(JSON.stringify(pc.rows[0], null, 2));

        // Check RYZEN 3 3200G
        const cpu = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%RYZEN 3 3200G%' 
            LIMIT 1
        `);
        console.log('\n=== AMD RYZEN 3 3200G ===');
        console.log(JSON.stringify(cpu.rows[0], null, 2));

        // Check ADATA DDR4 RAM
        const ram = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%16GB ADATA DDR4%' 
            LIMIT 1
        `);
        console.log('\n=== 16GB ADATA DDR4 RAM ===');
        console.log(JSON.stringify(ram.rows[0], null, 2));

        // Check ASROCK B560 Motherboard  
        const mb2 = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%ARC%' OR name ILIKE '%B560%'
            LIMIT 5
        `);
        console.log('\n=== INTEL ARC / B560 RESULTS ===');
        console.log(JSON.stringify(mb2.rows, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSpecs();
