const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function checkStructure() {
  try {
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE' 
      ORDER BY table_name
    `);
    
    console.log('\n=== ALL TABLES ===');
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check for CPU-related tables
    const cpuTables = tables.rows.filter(r => r.table_name.toLowerCase().includes('cpu') || r.table_name.toLowerCase().includes('processor'));
    
    if (cpuTables.length > 0) {
      console.log('\n=== CPU TABLE STRUCTURE ===');
      const cpuTable = cpuTables[0].table_name;
      const cpuSample = await pool.query(`SELECT * FROM ${cpuTable} LIMIT 1`);
      console.log(JSON.stringify(cpuSample.rows[0], null, 2));
    }
    
    // Check cooling table for socket info
    console.log('\n=== CHECKING FOR SOCKET INFO IN COOLING ===');
    const coolingSample = await pool.query(`
      SELECT id, name, max_rpm, max_noise, height, water_cooled, fanless 
      FROM cooling 
      WHERE name ILIKE '%AM4%' OR name ILIKE '%AM5%' OR name ILIKE '%LGA%' OR name ILIKE '%1700%'
      LIMIT 5
    `);
    console.log(JSON.stringify(coolingSample.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
