const { query, pool } = require('../config/db');
(async () => {
  try {
    const r = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_logs' ORDER BY ordinal_position");
    console.log(r.rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
