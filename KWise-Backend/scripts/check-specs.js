require('dotenv').config();
const db = require('../config/db');

(async () => {
  try {
    const res = await db.query(`
      SELECT id, name, category, specifications 
      FROM pc_parts 
      WHERE category IN ('CPU', 'Motherboard') 
      LIMIT 5
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
