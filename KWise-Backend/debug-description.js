const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkDescriptionColumn() {
  try {
    // Check if description column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' AND column_name = 'description'
    `);
    
    console.log('📋 Description column info:');
    console.log(columnCheck.rows);
    
    // Test update a description
    console.log('\n🧪 Testing description update...');
    const testUpdate = await pool.query(`
      UPDATE pc_parts 
      SET description = 'Test description for debugging' 
      WHERE id = (SELECT id FROM pc_parts LIMIT 1) 
      RETURNING id, name, description
    `);
    
    console.log('✅ Update result:');
    console.log(testUpdate.rows);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyQuery = await pool.query(`
      SELECT id, name, description 
      FROM pc_parts 
      WHERE description IS NOT NULL 
      LIMIT 3
    `);
    
    console.log('📄 Records with descriptions:');
    console.log(verifyQuery.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDescriptionColumn();