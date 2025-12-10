require('dotenv').config();
const { query } = require('../config/db');

async function main() {
    const token = (process.argv[2] || '').trim();
    if (!token) {
        console.error('Usage: node scripts/find-token.js <6-digit-token>');
        process.exit(1);
    }
    try {
        const result = await query(
            `SELECT id, name, email, reference_email, password_reset_token, password_reset_expires, NOW() as now
             FROM users WHERE password_reset_token = $1`,
            [token]
        );
        if (result.rows.length === 0) {
            console.log(JSON.stringify({ found: false, token }, null, 2));
            process.exit(0);
        }
        const u = result.rows[0];
        const isExpired = new Date(u.password_reset_expires) <= new Date(u.now);
        console.log(JSON.stringify({
            found: true,
            token,
            user: { id: u.id, email: u.email, reference_email: u.reference_email, name: u.name },
            password_reset_expires: u.password_reset_expires,
            now: u.now,
            isExpired
        }, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

main();


