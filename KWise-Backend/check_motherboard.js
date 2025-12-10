const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'humbleludwig13',
  database: 'KWiseDB',
  port: 5432
});

async function checkMotherboardSpecs() {
  try {
    const result = await pool.query(`
      SELECT id, name, specifications 
      FROM pc_parts 
      WHERE name LIKE '%AORUS ELITE B550M AX%' OR name LIKE '%AORUS ELITE B550M%'
      LIMIT 5
    `);
    
    console.log('Motherboard Results:');
    result.rows.forEach(row => {
      console.log('\n---');
      console.log('ID:', row.id);
      console.log('Name:', row.name);
      console.log('Specifications:', JSON.stringify(row.specifications, null, 2));
      
      // Test the exact parsing logic used in code
      const specs = row.specifications;
      console.log('\n🧪 PARSING TEST:');
      console.log(`sata_ports value: "${specs.sata_ports}" (type: ${typeof specs.sata_ports})`);
      console.log(`SATA Ports value: "${specs['SATA Ports']}" (type: ${typeof specs['SATA Ports']})`);
      console.log(`parseInt(sata_ports): ${parseInt(specs.sata_ports)}`);
      console.log(`parseInt(SATA Ports): ${parseInt(specs['SATA Ports'])}`);
      
      const result1 = parseInt(specs.sata_ports);
      const result2 = parseInt(specs['SATA Ports']);
      console.log(`\nOld logic: parseInt(sata_ports) || 0 = ${result1 || 0}`);
      console.log(`New logic: parseInt(sata_ports) || parseInt(SATA Ports) || 0 = ${result1 || result2 || 0}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMotherboardSpecs();
