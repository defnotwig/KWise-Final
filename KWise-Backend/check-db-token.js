const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDatabaseToken() {
    try {
        console.log('🔍 Checking database for reset tokens...');
        
        const query = `
            SELECT 
                id, 
                username, 
                email, 
                reference_email,
                password_reset_token,
                password_reset_expires,
                reset_status,
                NOW() as current_time
            FROM users 
            WHERE reference_email = $1 OR email = $1
            ORDER BY id DESC
            LIMIT 1
        `;
        
        const result = await pool.query(query, ['ludwig.rivera26@gmail.com']);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('👤 User found:', {
                id: user.id,
                username: user.username,
                email: user.email,
                reference_email: user.reference_email,
                reset_token: user.password_reset_token,
                reset_token_expires: user.password_reset_expires,
                reset_status: user.reset_status,
                current_time: user.current_time
            });
            
            // Check if token is still valid
            const isExpired = new Date() > new Date(user.password_reset_expires);
            console.log('⏰ Token expired:', isExpired);
            console.log('🔐 Token status:', user.reset_status);
            
        } else {
            console.log('❌ No user found with that email');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseToken();