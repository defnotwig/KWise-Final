const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432,
});

async function removeDuplicateRAMSTA() {
  try {
    // Keep the older one (ID: 125) and soft delete the newer one (ID: 144)
    const deleteQuery = "UPDATE pc_parts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = 144";
    const result = await pool.query(deleteQuery);
    
    console.log('✅ Soft deleted duplicate RAMSTA H311M (ID: 144)');
    console.log(`Affected rows: ${result.rowCount}`);
    
    // Verify the change
    const verifyQuery = "SELECT id, name, is_active FROM pc_parts WHERE name ILIKE '%RAMSTA H311M%' ORDER BY id";
    const verifyResult = await pool.query(verifyQuery);
    
    console.log('\n📋 Current RAMSTA H311M entries after cleanup:');
    verifyResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: "${row.name}", Active: ${row.is_active}`);
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

removeDuplicateRAMSTA();