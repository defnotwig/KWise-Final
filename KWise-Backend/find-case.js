const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

pool.query("SELECT name, specifications->'supported_form_factors' as ff, specifications->'max_gpu_length_mm' as gpu_len FROM pc_parts WHERE category='PC Case' AND name LIKE '%POWERLOGIC%' LIMIT 3")
  .then(r => {
    console.log('Cases found:', r.rows.length);
    r.rows.forEach(row => {
      console.log('- Name:', row.name);
      console.log('  Form factors:', row.ff);
      console.log('  Max GPU length:', row.gpu_len);
    });
    process.exit();
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
