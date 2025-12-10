const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function cleanupDuplicates() {
  try {
    console.log('🧹 Cleaning up duplicate 1stPlayer MI 8 entries...\n');
    
    // Check current state
    const currentState = await pool.query(`
      SELECT id, name, is_active, stock, created_at, updated_at
      FROM pc_parts 
      WHERE name ILIKE '%1stPlayer MI 8%'
      ORDER BY id;
    `);
    
    console.log('📊 Current duplicate entries:');
    console.table(currentState.rows);
    
    if (currentState.rows.length > 0) {
      // Keep the first one (ID 187) and delete the rest completely
      const keepId = currentState.rows[0].id;
      const deleteIds = currentState.rows.slice(1).map(row => row.id);
      
      console.log(`\n🔄 Keeping ID ${keepId}, deleting IDs: ${deleteIds.join(', ')}`);
      
      // Hard delete the duplicates
      if (deleteIds.length > 0) {
        const deleteResult = await pool.query(`
          DELETE FROM pc_parts 
          WHERE id = ANY($1)
          RETURNING id, name;
        `, [deleteIds]);
        
        console.log('✅ Deleted entries:');
        console.table(deleteResult.rows);
      }
      
      // Ensure the remaining one is active
      const updateResult = await pool.query(`
        UPDATE pc_parts 
        SET is_active = true, stock = 100, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `, [keepId]);
      
      console.log('✅ Updated remaining entry:');
      console.table(updateResult.rows);
      
      // Final verification
      const finalState = await pool.query(`
        SELECT id, name, is_active, stock, updated_at
        FROM pc_parts 
        WHERE name ILIKE '%1stPlayer MI 8%'
        ORDER BY id;
      `);
      
      console.log('\n📋 Final state:');
      console.table(finalState.rows);
      
    } else {
      console.log('❌ No 1stPlayer MI 8 entries found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupDuplicates();