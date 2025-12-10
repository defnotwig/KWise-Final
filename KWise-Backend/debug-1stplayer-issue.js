const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function debugDatabase() {
  try {
    console.log('🔍 Investigating 1stPlayer MI 8 database issue...\n');
    
    // Check all entries with "1stPlayer MI 8" name
    const duplicateQuery = `
      SELECT id, name, category, brand, price, stock, is_active, created_at, updated_at
      FROM pc_parts 
      WHERE name ILIKE '%1stPlayer MI 8%' 
      ORDER BY id;
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    console.log('📊 All "1stPlayer MI 8" entries in database:');
    console.log('Total found:', duplicateResult.rows.length);
    console.table(duplicateResult.rows);
    
    // Check the highest ID to see latest additions
    const latestQuery = `
      SELECT id, name, category, brand, price, stock, is_active, created_at, updated_at
      FROM pc_parts 
      WHERE id IN (187, 188, 189)
      ORDER BY id;
    `;
    
    const latestResult = await pool.query(latestQuery);
    console.log('\n📋 Specific IDs (187, 188, 189):');
    console.table(latestResult.rows);
    
    // Check total count by status
    const statusQuery = `
      SELECT 
        is_active,
        COUNT(*) as count
      FROM pc_parts 
      WHERE name ILIKE '%1stPlayer MI 8%'
      GROUP BY is_active;
    `;
    
    const statusResult = await pool.query(statusQuery);
    console.log('\n📈 Count by status:');
    console.table(statusResult.rows);
    
    // Check latest entries in general
    const recentQuery = `
      SELECT id, name, is_active, created_at
      FROM pc_parts 
      WHERE id >= 185
      ORDER BY id DESC;
    `;
    
    const recentResult = await pool.query(recentQuery);
    console.log('\n🕐 Recent entries (ID >= 185):');
    console.table(recentResult.rows);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

debugDatabase();