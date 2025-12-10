const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkRamstaSpecs() {
    try {
        const result = await pool.query(
            `SELECT id, name, specifications 
             FROM pc_parts 
             WHERE name = 'RAMSTA H310M'`
        );
        
        if (result.rows.length > 0) {
            console.log('📋 RAMSTA H310M Specifications:');
            console.log(JSON.stringify(result.rows[0], null, 2));
            
            const specs = result.rows[0].specifications;
            console.log('\n🔍 M.2 Slots:');
            console.log('  - m2_slots:', specs.m2_slots);
            console.log('  - M2 Slots:', specs['M2 Slots']);
            console.log('\n🔍 RAM Slots:');
            console.log('  - ram_slots:', specs.ram_slots);
            console.log('  - Ram Slots:', specs['Ram Slots']);
            console.log('\n🔍 SATA Ports:');
            console.log('  - sata_ports:', specs.sata_ports);
            console.log('  - SATA Ports:', specs['SATA Ports']);
        } else {
            console.log('❌ RAMSTA H310M not found in database');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkRamstaSpecs();
