// Fix SATA ports discrepancy for motherboard ID 109
// Database has sata_ports: 6 but SATA Ports: 4 - the correct value is 4

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'humbleludwig13',
  database: 'KWiseDB',
  port: 5432
});

async function fixSataPorts() {
  try {
    // Update sata_ports to match the correct "SATA Ports" value
    const result = await pool.query(`
      UPDATE pc_parts 
      SET specifications = jsonb_set(specifications, '{sata_ports}', '4', false) 
      WHERE id = 109
      RETURNING id, name, specifications->>'sata_ports' as sata_ports, specifications->>'SATA Ports' as sata_ports_alt
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully updated motherboard:', result.rows[0]);
      console.log('   sata_ports is now:', result.rows[0].sata_ports);
      console.log('   SATA Ports remains:', result.rows[0].sata_ports_alt);
    } else {
      console.log('⚠️ No rows updated - motherboard ID 109 not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSataPorts();
