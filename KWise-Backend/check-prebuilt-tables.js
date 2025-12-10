require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

async function checkPrebuiltTables() {
  try {
    // Check for prebuilt tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%prebuilt%'
    `);
    
    console.log('📊 Prebuilt Tables Found:', result.rows.length);
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check pc_parts categories
    const categories = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM pc_parts
      WHERE kiosk_visible = true
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\n📦 PC Parts Categories:');
    console.log(JSON.stringify(categories.rows, null, 2));
    
    // Check prebuilt_pcs table structure
    const prebuiltColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prebuilt_pcs'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏗️  Prebuilt PCs Table Columns:');
    console.log(JSON.stringify(prebuiltColumns.rows, null, 2));
    
    // Check if there's data in prebuilt_pcs
    const prebuiltData = await pool.query(`
      SELECT id, name, category, total_price 
      FROM prebuilt_pcs 
      LIMIT 5
    `);
    
    console.log('\n💾 Prebuilt PCs Data Sample:');
    console.log(JSON.stringify(prebuiltData.rows, null, 2));
    console.log(`Total Prebuilt PCs: ${prebuiltData.rowCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPrebuiltTables();
