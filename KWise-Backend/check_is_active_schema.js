const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432,
});

async function checkSchema() {
  try {
    // Check if is_active column exists
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      AND column_name = 'is_active'
    `;
    const schemaResult = await pool.query(schemaQuery);
    
    console.log('=== is_active Column Check ===');
    if (schemaResult.rows.length === 0) {
      console.log('❌ is_active column does NOT exist in pc_parts table');
      
      // Show all columns
      const allColumnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'pc_parts' 
        ORDER BY ordinal_position
      `;
      const allColumnsResult = await pool.query(allColumnsQuery);
      console.log('\n📋 Available columns in pc_parts:');
      allColumnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`);
      });
    } else {
      console.log('✅ is_active column exists:');
      schemaResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`);
      });
      
      // Check current is_active values
      const valueQuery = "SELECT is_active, COUNT(*) as count FROM pc_parts GROUP BY is_active ORDER BY is_active";
      const valueResult = await pool.query(valueQuery);
      console.log('\n📊 Current is_active distribution:');
      valueResult.rows.forEach(row => {
        console.log(`  is_active = ${row.is_active}: ${row.count} items`);
      });
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();