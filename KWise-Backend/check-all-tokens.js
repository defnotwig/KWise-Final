const db = require('./config/db');

async function checkAllTokens() {
  try {
    const result = await db.query(
      `SELECT id, name, email, reference_email, password_reset_token, 
              password_reset_expires, reset_status, reset_attempts,
              password_reset_expires > NOW() as not_expired,
              EXTRACT(EPOCH FROM (password_reset_expires - NOW())) as seconds_until_expire
       FROM users 
       WHERE password_reset_token IS NOT NULL
       ORDER BY password_reset_expires DESC`
    );
    
    console.log('All tokens in database:');
    result.rows.forEach(user => {
      console.log({
        id: user.id,
        name: user.name,
        email: user.email,
        reference_email: user.reference_email,
        token: user.password_reset_token,
        expires: user.password_reset_expires,
        status: user.reset_status,
        attempts: user.reset_attempts,
        not_expired: user.not_expired,
        seconds_until_expire: user.seconds_until_expire
      });
    });
    
    if (result.rows.length === 0) {
      console.log('No tokens found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAllTokens();