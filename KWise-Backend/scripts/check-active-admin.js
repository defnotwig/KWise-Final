const pool = require('../config/db');

async function checkActiveAdmin() {
  const result = await pool.query(
    `SELECT id, email, role, is_active 
     FROM users 
     WHERE (role = 'admin' OR role = 'superadmin') AND is_active = true 
     ORDER BY id`
  );
  console.log('Active admin users:', result.rows);
  process.exit();
}

checkActiveAdmin();
