require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'humbleludwig13',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkResetTokens() {
  try {
    console.log('🔍 Checking reset tokens...');
    
    const result = await pool.query(`
      SELECT id, name, email, reference_email, 
             password_reset_token, password_reset_expires, 
             reset_status, reset_attempts,
             CASE 
               WHEN password_reset_expires > NOW() THEN 'valid'
               ELSE 'expired'
             END as token_validity
      FROM users 
      WHERE reference_email = $1 OR email = $1
    `, ['ludwig.rivera26@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('📋 User reset token data:');
      result.rows.forEach(user => {
        console.log({
          id: user.id,
          name: user.name,
          email: user.email,
          reference_email: user.reference_email,
          reset_token: user.password_reset_token,
          expires: user.password_reset_expires,
          status: user.reset_status,
          attempts: user.reset_attempts,
          validity: user.token_validity
        });
      });
    } else {
      console.log('❌ No user found with that email');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    await pool.end();
  }
}

checkResetTokens();