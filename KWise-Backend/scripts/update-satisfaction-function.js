const pool = require('../config/db');
const fs = require('node:fs');
const path = require('node:path');

async function updateFunction() {
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'sql', 'priority3-real-world-data-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Extract just the function definition
    const functionMatch = sql.match(/CREATE OR REPLACE FUNCTION get_component_satisfaction_score[\s\S]*?\$\$ LANGUAGE plpgsql;/);
    
    if (!functionMatch) {
      throw new Error('Function not found in SQL file');
    }
    
    console.log('📝 Updating get_component_satisfaction_score function...');
    await pool.query(functionMatch[0]);
    console.log('✅ Function updated successfully!');
    
    // Test it
    const result = await pool.query('SELECT * FROM get_component_satisfaction_score(30)');
    console.log('✅ Test result:', result.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateFunction();
