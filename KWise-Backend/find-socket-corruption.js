const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function findSocketCorruption() {
  console.log('🔍 Looking for Socket/Chipset Data Corruption...\n');
  
  try {
    // Check if any motherboard has AMD socket with Intel chipset or vice versa
    console.log('1️⃣ CHECKING FOR MISMATCHED SOCKET/CHIPSET COMBINATIONS:\n');
    
    const mismatches = await pool.query(`
      SELECT id, name, brand,
             specifications->>'socket' as socket,
             specifications->>'chipset' as chipset
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
        AND (
          (specifications->>'socket' LIKE 'AM%' AND specifications->>'chipset' LIKE 'Intel%')
          OR
          (specifications->>'socket' LIKE 'LGA%' AND specifications->>'chipset' LIKE 'AMD%')
        )
      ORDER BY id
    `);
    
    if (mismatches.rows.length > 0) {
      console.log(`❌ Found ${mismatches.rows.length} motherboards with mismatched socket/chipset:\n`);
      mismatches.rows.forEach(mb => {
        console.log(`   ID ${mb.id}: ${mb.name}`);
        console.log(`   Socket: ${mb.socket} | Chipset: ${mb.chipset}`);
        console.log('');
      });
    } else {
      console.log('✅ No socket/chipset mismatches found in database\n');
    }
    
    // Check motherboard 143 specifically
    console.log('2️⃣ MOTHERBOARD 143 FULL SPECIFICATIONS:\n');
    const mb143 = await pool.query(`
      SELECT id, name, brand, category, price, stock, status,
             specifications, created_at, updated_at
      FROM pc_parts
      WHERE id = 143
    `);
    
    if (mb143.rows.length > 0) {
      console.log(JSON.stringify(mb143.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findSocketCorruption();
