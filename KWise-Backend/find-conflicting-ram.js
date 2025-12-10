const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function findConflictingRAM() {
  try {
    console.log('🔍 Finding RAM products with conflicting DDR type specifications...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        specifications->'type' as type_field,
        specifications->'memory_type' as memory_type_field,
        specifications->'speed' as speed,
        specifications
      FROM pc_parts 
      WHERE category = 'RAM'
        AND specifications->'type' IS NOT NULL
        AND specifications->'memory_type' IS NOT NULL
        AND specifications->'type' != specifications->'memory_type'
      ORDER BY name
    `);
    
    console.log(`❌ Found ${result.rows.length} RAM products with conflicting DDR types:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Name: ${row.name}`);
      console.log(`   specifications.type: ${row.type_field}`);
      console.log(`   specifications.memory_type: ${row.memory_type_field}`);
      console.log(`   Speed: ${row.speed} MHz`);
      
      // Determine correct DDR type based on speed
      const speed = parseInt(row.speed);
      let correctDDR = null;
      if (speed >= 4800) {
        correctDDR = 'DDR5';
      } else if (speed >= 1600 && speed <= 3600) {
        correctDDR = 'DDR4';
      }
      
      console.log(`   ✅ Correct DDR type (based on speed): ${correctDDR}`);
      console.log('');
    });
    
    console.log('\n🔧 Fix needed: Update specifications to have consistent DDR types');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findConflictingRAM();
