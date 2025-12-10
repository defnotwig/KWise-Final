const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

pool.query(`
    SELECT id, name, specifications 
    FROM pc_parts 
    WHERE name = 'ASUS PRIME B760M-A WIFI D4'
`).then(result => {
    console.log('\n🔍 ASUS PRIME B760M-A WIFI D4 SPECS:\n');
    if (result.rows.length > 0) {
        const mobo = result.rows[0];
        console.log(`ID: ${mobo.id}`);
        console.log(`Name: ${mobo.name}`);
        console.log(`\n📋 Full Specifications:`);
        console.log(JSON.stringify(mobo.specifications, null, 2));
        console.log(`\n🔍 M.2 Slot Field Detection:`);
        console.log(`  specs.m2_slots = ${mobo.specifications.m2_slots}`);
        console.log(`  specs.m2_slot_count = ${mobo.specifications.m2_slot_count}`);
        console.log(`  specs['M2 Slots'] = ${mobo.specifications['M2 Slots']}`);
        console.log(`  specs['M.2 Slots'] = ${mobo.specifications['M.2 Slots']}`);
        console.log(`  specs.m_2_slots = ${mobo.specifications.m_2_slots}`);
        
        const detectedSlots = parseInt(
            mobo.specifications.m2_slots || 
            mobo.specifications.m2_slot_count || 
            mobo.specifications['M2 Slots'] || 
            mobo.specifications['M.2 Slots'] || 
            mobo.specifications.m_2_slots
        ) || 0;
        
        console.log(`\n✅ Our Fallback Chain Result: ${detectedSlots} M.2 slots`);
        console.log(`\n🔍 SATA Ports Field Detection:`);
        console.log(`  specs.sata_ports = ${mobo.specifications.sata_ports}`);
        console.log(`  specs.sata_port_count = ${mobo.specifications.sata_port_count}`);
        console.log(`  specs['SATA Ports'] = ${mobo.specifications['SATA Ports']}`);
        console.log(`  specs['SATA ports'] = ${mobo.specifications['SATA ports']}`);
        
        const detectedSATA = parseInt(
            mobo.specifications.sata_ports || 
            mobo.specifications.sata_port_count || 
            mobo.specifications['SATA Ports'] || 
            mobo.specifications['SATA ports']
        ) || 6;
        
        console.log(`\n✅ Our Fallback Chain Result: ${detectedSATA} SATA ports\n`);
    } else {
        console.log('❌ Board not found!');
    }
    pool.end();
}).catch(error => {
    console.error('❌ Error:', error);
    pool.end();
});
