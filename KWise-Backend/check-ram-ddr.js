const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function checkRAMDDRTypes() {
  try {
    console.log('🔍 Checking RAM DDR type storage in database...\n');
    
    // First, check what RAM categories exist
    const catResult = await pool.query(`
      SELECT DISTINCT category 
      FROM pc_parts 
      WHERE category ILIKE '%RAM%' OR category ILIKE '%memory%'
    `);
    
    console.log('📦 RAM categories found:', catResult.rows.map(r => r.category));
    console.log('');
    
    const result = await pool.query(`
      SELECT 
        name, 
        category,
        specifications->'type' as type_field,
        specifications->'memory_type' as memory_type_field,
        specifications
      FROM pc_parts 
      WHERE (category ILIKE '%RAM%' OR category ILIKE '%memory%')
        AND (name LIKE '%T-FORCE%' OR name LIKE '%DarkZa%' OR name LIKE '%Kingston%')
      LIMIT 10
    `);
    
    console.log(`📦 Found ${result.rows.length} RAM products:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}`);
      console.log(`   specifications.type: ${row.type_field}`);
      console.log(`   specifications.memory_type: ${row.memory_type_field}`);
      console.log(`   Full specs:`, row.specifications);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRAMDDRTypes();
