/**
 * Product Classification Migration Script
 * Applies add-product-classification.sql migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runMigration() {
  console.log('🚀 Starting product classification migration...\n');
  
  try {
    // Read migration SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'add-product-classification.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await pool.query(sql);
    
    console.log('✅ Product classification migration applied successfully\n');
    
    // Verify columns were added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'stock_items' 
        AND column_name IN ('classification', 'extended_metadata')
      ORDER BY column_name
    `);
    
    console.log('📋 Verified columns:');
    verifyResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''})`);
    });
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
