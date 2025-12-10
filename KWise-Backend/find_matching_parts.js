const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function findMatchingParts() {
  try {
    console.log('\n🔍 Finding Matching Parts for Starter Build A...\n');
    
    const components = [
      { name: 'CPU', value: 'AMD Ryzen 5 4600G (TTP) W/ AMD COOLER' },
      { name: 'Motherboard', value: 'GIGABYTE A520M-K V2' },
      { name: 'RAM', value: '16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK' },
      { name: 'Storage', value: '512GB TEAMGROUP MP33 PRO' },
      { name: 'PSU', value: '750W YGT KY-750' },
      { name: 'Case', value: 'KEYTECH ROBIN VIEW' }
    ];
    
    console.log('Searching for matching parts in pc_parts table...\n');
    
    for (const comp of components) {
      const result = await pool.query(`
        SELECT id, name, category, price, stock
        FROM pc_parts
        WHERE category = $1 
          AND (
            LOWER(name) LIKE LOWER($2)
            OR LOWER($2) LIKE LOWER('%' || name || '%')
            OR similarity(LOWER(name), LOWER($2)) > 0.3
          )
          AND is_active = true
        ORDER BY similarity(LOWER(name), LOWER($2)) DESC
        LIMIT 3
      `, [comp.name, comp.value]);
      
      console.log(`📦 ${comp.name}: "${comp.value}"`);
      if (result.rows.length > 0) {
        console.log(`   Found ${result.rows.length} potential matches:`);
        result.rows.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ID: ${row.id} | Name: ${row.name} | Price: ₱${row.price} | Stock: ${row.stock}`);
        });
      } else {
        console.log(`   ❌ No matches found in pc_parts table`);
      }
      console.log('');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findMatchingParts();
