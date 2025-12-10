const pool = require('../config/db');

async function testFunction() {
  try {
    const result = await pool.query('SELECT get_component_satisfaction_score(30) as score');
    console.log('✅ Function exists and works!');
    console.log('Score:', result.rows[0].score);
    process.exit(0);
  } catch (error) {
    console.error('❌ Function error:', error.message);
    process.exit(1);
  }
}

testFunction();
