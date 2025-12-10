const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pc_parts' ORDER BY ordinal_position", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows.map(r => r.column_name).join(', '));
  pool.end();
});
