const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='price_history' ORDER BY ordinal_position")
    .then(r => {
        console.log('price_history columns:', r.rows.map(x => x.column_name).join(', '));
        return pool.end();
    })
    .catch(e => {
        console.error('Error:', e.message);
        pool.end();
    });
