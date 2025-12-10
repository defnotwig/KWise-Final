const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432,
});

async function checkRAMSTA() {
  try {
    // Check all RAMSTA H311M entries
    const ramstaQuery = "SELECT id, name, category, brand, stock, created_at FROM pc_parts WHERE name ILIKE '%RAMSTA H311M%' ORDER BY id";
    const ramstaResult = await pool.query(ramstaQuery);
    
    console.log('=== RAMSTA H311M Database Entries ===');
    console.log(`Found ${ramstaResult.rows.length} entries:`);
    ramstaResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: "${row.name}", Category: ${row.category}, Brand: ${row.brand}, Stock: ${row.stock}, Created: ${row.created_at}`);
    });
    
    // Check for any duplicates by name in motherboard category
    const duplicateQuery = "SELECT name, category, COUNT(*) as count FROM pc_parts WHERE category = 'Motherboard' GROUP BY name, category HAVING COUNT(*) > 1";
    const duplicateResult = await pool.query(duplicateQuery);
    
    console.log('\n=== Duplicate Motherboard Entries ===');
    if (duplicateResult.rows.length === 0) {
      console.log('No duplicates found in motherboard category');
    } else {
      duplicateResult.rows.forEach(row => {
        console.log(`Duplicate: "${row.name}" (Category: ${row.category}) - Count: ${row.count}`);
      });
    }
    
    // Get total motherboard count
    const totalQuery = "SELECT COUNT(*) as total FROM pc_parts WHERE category = 'Motherboard'";
    const totalResult = await pool.query(totalQuery);
    console.log(`\nTotal motherboard entries: ${totalResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkRAMSTA();