require('dotenv').config();
const { query } = require('../config/db');

async function main() {
    const argEmail = process.argv[2];
    if (!argEmail) {
        console.error('Usage: node scripts/inspect-reset.js <email-or-reference-email>');
        process.exit(1);
    }
    try {
        const result = await query(
            `SELECT id, name, email, reference_email, password_reset_token, password_reset_expires
             FROM users
             WHERE email = $1 OR reference_email = $1
             LIMIT 1`,
            [argEmail]
        );
        if (result.rows.length === 0) {
            console.log('No user found for:', argEmail);
            process.exit(0);
        }
        const user = result.rows[0];
        console.log(JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            reference_email: user.reference_email,
            password_reset_token: user.password_reset_token || null,
            password_reset_expires: user.password_reset_expires || null
        }, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

main();
