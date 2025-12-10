require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function checkResetToken() {
    try {
        const result = await pool.query(
            `SELECT id, name, email, reference_email, password_reset_token, password_reset_expires, reset_attempts, reset_status
             FROM users 
             WHERE email = $1 OR reference_email = $1`,
            ['ludwig.rivera26@gmail.com']
        );
        
        console.log('Current user data:');
        console.log(result.rows[0]);
        
        // Check if token is still valid
        if (result.rows[0]) {
            const user = result.rows[0];
            const now = new Date();
            const expires = new Date(user.password_reset_expires);
            
            console.log('\nToken validation:');
            console.log('Current time:', now.toISOString());
            console.log('Token expires:', expires.toISOString());
            console.log('Token valid:', expires > now);
            console.log('Reset attempts:', user.reset_attempts);
            console.log('Reset status:', user.reset_status);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkResetToken();