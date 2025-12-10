const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function fixConflictingRAM() {
  try {
    console.log('🔧 Fixing RAM products with conflicting DDR type specifications...\n');
    
    // Fix Product ID 214: 3600MHz is DDR4, but type says DDR5
    console.log('1. Fixing ID 214: 16GB T-FORCE DELTA RGB 6000MHz *BLACK (actually 3600MHz DDR4)');
    await pool.query(`
      UPDATE pc_parts 
      SET 
        name = '16GB T-FORCE DELTA RGB (1x16GB) 3600MHz *BLACK',
        specifications = jsonb_set(specifications, '{type}', '"DDR4"')
      WHERE id = 214
    `);
    console.log('   ✅ Updated name to 3600MHz and type to DDR4\n');
    
    // Fix Product ID 215: 6000MHz is DDR5, memory_type should be DDR5
    console.log('2. Fixing ID 215: 16GB T-FORCE DELTA RGB 6000MHz *WHITE (DDR5)');
    await pool.query(`
      UPDATE pc_parts 
      SET specifications = jsonb_set(specifications, '{memory_type}', '"DDR5"')
      WHERE id = 215
    `);
    console.log('   ✅ Updated memory_type to DDR5\n');
    
    // Verify fixes
    console.log('✅ Verifying fixes...\n');
    const result = await pool.query(`
      SELECT 
        id, name,
        specifications->'type' as type,
        specifications->'memory_type' as memory_type,
        specifications->'speed' as speed
      FROM pc_parts 
      WHERE id IN (214, 215)
      ORDER BY id
    `);
    
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.name}`);
      console.log(`  type: ${row.type}, memory_type: ${row.memory_type}, speed: ${row.speed}MHz`);
      
      if (row.type === row.memory_type) {
        console.log('  ✅ DDR types now consistent!\n');
      } else {
        console.log('  ❌ Still conflicting!\n');
      }
    });
    
    console.log('🎉 Database corruption fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixConflictingRAM();
